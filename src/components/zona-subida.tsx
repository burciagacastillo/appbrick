"use client";

import { useRef, useState } from "react";
import { CircleAlert, CircleCheck, CloudUpload, LoaderCircle } from "lucide-react";

// Zona de carga de documentos: la del comprador en su link y la tuya en el
// expediente. Es de cliente porque tiene que hacer tres cosas en el navegador:
//
//   1. ACHICAR LAS FOTOS. Una foto de celular pesa 3-5 MB; achicada a 2400 px
//      pesa ~0.5 MB, se lee igual de bien y sube en segundos con mala señal.
//   2. SUBIR DIRECTO A SUPABASE cuando la app está publicada. Vercel gratis
//      corta las peticiones de más de 4.5 MB y una escritura escaneada pesa
//      10. El servidor da un permiso de un solo uso; el archivo no pasa por él.
//   3. AVISAR AL INSTANTE qué pasó, para que nadie le pique tres veces.
//
// La validación de verdad (bytes, tamaño, a qué trámite) sigue en el servidor.

type Permiso = { ruta: string; url: string } | null | { error: string };
type Resultado = { ok: true; mensaje: string } | { ok: false; error: string };

type Estado =
  | { tipo: "listo" }
  | { tipo: "subiendo"; paso: string }
  | { tipo: "ok"; mensaje: string; nombre: string }
  | { tipo: "error"; error: string };

const MB = 1024 * 1024;
/** Lo que cabe por el formulario en Vercel gratis (4.5 MB), con margen. */
const POR_FORMULARIO = 4 * MB;

/**
 * Escalera de calidad, como "tamaño del archivo" en el correo de Apple, pero
 * sin preguntarle a nadie: se toma el primer escalón que quede por debajo de
 * la meta. Casi siempre basta el primero (una foto de 4 MB queda en ~0.6).
 * Los escalones de abajo son para fotos enormes; hasta el último se lee una INE.
 */
const ESCALONES = [
  { lado: 2400, calidad: 0.85 },
  { lado: 2000, calidad: 0.8 },
  { lado: 1600, calidad: 0.75 },
  { lado: 1280, calidad: 0.7 },
];
const META_FOTO = 2.5 * MB;

/** Manda el archivo directo a Supabase, igual que lo hace su librería. */
async function subirDirecto(url: string, archivo: File): Promise<boolean> {
  try {
    const cuerpo = new FormData();
    cuerpo.append("cacheControl", "3600");
    cuerpo.append("", archivo);
    const r = await fetch(url, { method: "PUT", body: cuerpo, headers: { "x-upsert": "false" } });
    return r.ok;
  } catch {
    return false;
  }
}

const SUBTIPOS = [
  { valor: "a", etiqueta: "Documento" },
  { valor: "b", etiqueta: "Orden de cobro" },
  { valor: "c", etiqueta: "Comprobante de pago" },
];

/**
 * Achica fotos grandes a JPEG bajando por la escalera de calidad. Si el
 * navegador no puede leer la foto, manda la original y que decida el servidor.
 */
export async function achicarSiEsFoto(archivo: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) return archivo;
  if (archivo.size < 1.2 * MB) return archivo;
  try {
    const imagen = await createImageBitmap(archivo);
    let mejor: Blob | null = null;

    for (const { lado, calidad } of ESCALONES) {
      const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(imagen.width * escala);
      lienzo.height = Math.round(imagen.height * escala);
      lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/jpeg", calidad));
      if (blob) mejor = blob;
      if (blob && blob.size <= META_FOTO) break;
    }

    if (!mejor || mejor.size >= archivo.size) return archivo;
    const base = archivo.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([mejor], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}

export function ZonaSubida({
  campos,
  preparar,
  confirmar,
  titulo = "Toma una foto o elige el archivo",
  conSubTipo = false,
  compacta = false,
  maximoMb = 20,
}: {
  /** El servidor vuelve a revisar; esto solo avisa antes de gastar datos. */
  maximoMb?: number;
  /** Campos que viajan con el archivo: token, tramiteId… */
  campos: Record<string, string>;
  /** Acción del servidor que da el permiso de subida directa (o null en local). */
  preparar: () => Promise<Permiso>;
  /** Acción del servidor que recibe y registra el archivo. */
  confirmar: (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
  titulo?: string;
  /** Municipales: elegir si es el documento, la orden de cobro o el pago. */
  conSubTipo?: boolean;
  compacta?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "listo" });
  const [encima, setEncima] = useState(false);
  const [subTipo, setSubTipo] = useState("a");
  const subiendo = estado.tipo === "subiendo";

  async function enviar(original: File | undefined) {
    if (!original || subiendo) return;

    try {
      setEstado({ tipo: "subiendo", paso: "Preparando…" });
      const archivo = await achicarSiEsFoto(original);
      if (archivo.size > maximoMb * MB) {
        setEstado({
          tipo: "error",
          error:
            `Pesa ${Math.ceil(archivo.size / MB)} MB y el máximo es ${maximoMb}. ` +
            "Escanéalo a menor resolución o tómale foto a cada hoja.",
        });
        return;
      }

      const datos = new FormData();
      for (const [k, v] of Object.entries(campos)) datos.append(k, v);
      if (conSubTipo) datos.append("subTipo", subTipo);

      const permiso = await preparar();
      if (permiso && "error" in permiso) {
        setEstado({ tipo: "error", error: permiso.error });
        return;
      }

      setEstado({ tipo: "subiendo", paso: "Subiendo…" });
      const directa = permiso ? await subirDirecto(permiso.url, archivo) : false;
      if (permiso && directa) {
        datos.append("rutaEntrante", permiso.ruta);
        datos.append("nombreOriginal", archivo.name);
      } else if (archivo.size <= POR_FORMULARIO) {
        // Local, o la subida directa falló: si cabe, va por el formulario.
        datos.append("archivo", archivo);
      } else {
        throw new Error("La subida directa falló y el archivo no cabe en el formulario");
      }

      setEstado({ tipo: "subiendo", paso: "Revisando…" });
      const resultado = await confirmar(null, datos);
      setEstado(
        resultado.ok
          ? { tipo: "ok", mensaje: resultado.mensaje, nombre: original.name }
          : { tipo: "error", error: resultado.error }
      );
    } catch {
      setEstado({
        tipo: "error",
        error: "No se pudo subir. Revisa tu señal e inténtalo otra vez.",
      });
    } finally {
      if (entrada.current) entrada.current.value = "";
    }
  }

  const zona = subiendo
    ? "border-brick-600/40 bg-brick-50"
    : estado.tipo === "ok"
      ? "border-emerald-300 bg-emerald-50"
      : estado.tipo === "error"
        ? "border-rose-300 bg-rose-50/60"
        : encima
          ? "border-brick-600 bg-brick-50 scale-[1.01]"
          : "border-slate-300 bg-fondo/60 hover:border-slate-400 hover:bg-fondo";

  return (
    <div>
      {conSubTipo ? (
        <div className="mb-3 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {SUBTIPOS.map((s) => (
            <button
              key={s.valor}
              type="button"
              onClick={() => setSubTipo(s.valor)}
              aria-pressed={subTipo === s.valor}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                subTipo === s.valor ? "bg-white text-tinta shadow-suave" : "text-tenue hover:text-tinta"
              }`}
            >
              <span className="mr-1 font-semibold">{s.valor}</span>
              {s.etiqueta}
            </button>
          ))}
        </div>
      ) : null}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!subiendo) setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          void enviar(e.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center transition-all duration-200 ${
          compacta ? "min-h-24 px-4 py-4" : "min-h-32 px-4 py-6"
        } ${zona} ${subiendo ? "pointer-events-none" : ""}`}
      >
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          disabled={subiendo}
          className="sr-only"
          onChange={(e) => void enviar(e.target.files?.[0])}
        />

        {subiendo ? (
          <>
            <LoaderCircle className="h-6 w-6 animate-spin text-brick-700" strokeWidth={1.75} />
            <span className="text-sm font-medium text-tinta">{estado.paso}</span>
            <span className="text-xs text-tenue">No cierres esta pantalla</span>
          </>
        ) : estado.tipo === "ok" ? (
          <>
            <CircleCheck className="h-6 w-6 text-emerald-600" strokeWidth={1.75} />
            <span className="text-sm font-medium text-emerald-800">{estado.mensaje}</span>
            <span className="max-w-full truncate text-xs text-emerald-700/80">{estado.nombre}</span>
          </>
        ) : estado.tipo === "error" ? (
          <>
            <CircleAlert className="h-6 w-6 text-rose-600" strokeWidth={1.75} />
            <span className="text-sm font-medium text-rose-700">{estado.error}</span>
            <span className="text-xs text-tenue">Toca para intentar otra vez</span>
          </>
        ) : (
          <>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-suave ring-1 ring-black/[0.04]">
              <CloudUpload className="h-5 w-5 text-tinta" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium text-tinta">{titulo}</span>
            <span className="text-xs text-tenue">
              Foto o PDF<span className="hidden sm:inline"> · también puedes arrastrarlo aquí</span>
            </span>
          </>
        )}
      </label>
    </div>
  );
}
