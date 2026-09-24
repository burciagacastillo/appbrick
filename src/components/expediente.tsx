import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, Upload } from "lucide-react";
import { esDeConyuge } from "@/lib/conyuge";
import { cambiarEstadoTramite, alternarSubdoc, guardarNotaTramite } from "@/acciones/propiedades";
import { prepararSubidaAdmin, subirDocumentoAdmin } from "@/acciones/documentos";
import { Badge } from "./ui";
import { ZonaSubida } from "./zona-subida";
import { ESTADOS_TRAMITE, BLOQUES } from "@/lib/constants";
import type { PropiedadDetalle } from "@/lib/queries";

const ETIQUETA_SUBTIPO: Record<string, string> = {
  a: "Documento",
  b: "Orden de cobro",
  c: "Comprobante de pago",
};

type Tramite = PropiedadDetalle["tramites"][number];

/** Los tres checks del ciclo a/b/c de un trámite municipal. */
function CicloPago({ t }: { t: Tramite }) {
  const pasos = [
    { campo: "docRecibido", label: "Documento", sufijo: "a", activo: t.docRecibido },
    { campo: "ordenDeCobro", label: "Orden de cobro", sufijo: "b", activo: t.ordenDeCobro },
    { campo: "pagoComprobado", label: "Pagado", sufijo: "c", activo: t.pagoComprobado },
  ];

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {pasos.map((p) => (
        <form key={p.campo} action={alternarSubdoc}>
          <input type="hidden" name="tramiteId" value={t.id} />
          <input type="hidden" name="campo" value={p.campo} />
          <button
            type="submit"
            className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
              p.activo
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-linea bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            <span className="font-semibold">{p.sufijo}</span> {p.label}{" "}
            {p.activo ? "✓" : ""}
          </button>
        </form>
      ))}
    </div>
  );
}

/**
 * Un trámite del expediente. Lo mínimo, a petición de Erick (24/09/2026):
 * nombre, está / no está, abrir y subir. El comentario solo aparece cuando
 * el trámite está en "?" (revisar): es donde se anota QUÉ hay que revisar.
 */
function FilaTramite({ t, propiedadId }: { t: Tramite; propiedadId: string }) {
  const alerta = t.ordenDeCobro && !t.pagoComprobado;
  const vencido = t.fechaLimite != null && t.fechaLimite < new Date() && t.estado !== "completo";
  const vivos = t.documentos.filter((d) => d.estado !== "rechazado");

  return (
    <li
      id={`tramite-${t.id}`}
      className={`scroll-mt-24 px-6 py-4 target:bg-amber-50/60 ${t.estado === "no_aplica" ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-semibold text-slate-400 tabular">
          {t.catalogo.numero}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{t.catalogo.nombre}</span>
            {t.catalogo.opcional ? <Badge>Si aplica</Badge> : null}
            {vencido ? <Badge color="rose">Vencido</Badge> : null}
            {alerta ? <Badge color="amber">Falta comprobante</Badge> : null}
          </div>

          {/* En celular, la botonera baja para no apretar el nombre. */}
          <div className="mt-2 sm:hidden">
            <BotonesEstado t={t} />
          </div>

          {/* Los archivos, abribles con un toque — también desde el celular.
              El link pasa por /api/documento, que revisa permiso y deja
              registro; nunca es la dirección directa del archivo. */}
          {t.documentos.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.documentos.map((d) => (
                <li key={d.id}>
                  <a
                    href={`/api/documento/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title={d.nombreArchivo}
                    className={`inline-flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
                      d.estado === "rechazado"
                        ? "bg-white text-slate-400 line-through ring-linea"
                        : "bg-white text-tinta ring-linea hover:bg-slate-50 hover:ring-slate-300"
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-tenue" strokeWidth={1.75} />
                    <span className="truncate">
                      {d.subTipo ? `${d.subTipo} · ${ETIQUETA_SUBTIPO[d.subTipo] ?? "Archivo"}` : "Abrir"}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
                  </a>
                  {d.estado === "pendiente" ? (
                    <span className="ml-1.5 align-middle">
                      <Badge color="amber">Sin revisar</Badge>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {/* Los trámites 13, 18 y 19 no son archivos: son datos que se
              capturan en la pestaña Personas. */}
          {t.catalogo.esDato ? (
            <Link
              href={`/propiedades/${encodeURIComponent(propiedadId)}?tab=personas`}
              className="mt-2 inline-block text-xs font-medium text-tenue hover:text-tinta"
            >
              Se captura en Personas →
            </Link>
          ) : null}

          {t.catalogo.requierePago ? <CicloPago t={t} /> : null}

          {t.estado === "revisar" ? <ComentarioRevisar t={t} /> : null}

          {!t.catalogo.esDato && t.estado !== "no_aplica" ? (
            <details className="group/subir mt-3">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-tenue ring-1 ring-inset ring-linea transition-colors hover:bg-slate-50 hover:text-tinta group-open/subir:bg-slate-100 group-open/subir:text-tinta">
                <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                {vivos.length > 0 ? "Subir otro archivo" : "Subir archivo"}
              </summary>
              <div className="mt-3 max-w-md">
                <ZonaSubida
                  campos={{ tramiteId: t.id }}
                  preparar={prepararSubidaAdmin}
                  confirmar={subirDocumentoAdmin}
                  conSubTipo={t.catalogo.requierePago}
                  titulo="Elige el archivo o tómale foto"
                  maximoMb={50}
                  compacta
                />
              </div>
            </details>
          ) : null}
        </div>

        {/* En pantalla ancha, la botonera va a la derecha. */}
        <div className="hidden shrink-0 sm:block">
          <BotonesEstado t={t} />
        </div>
      </div>
    </li>
  );
}

/** Solo en "?": qué hay que revisar de este trámite. */
function ComentarioRevisar({ t }: { t: Tramite }) {
  return (
    <form action={guardarNotaTramite} className="mt-3 max-w-xl rounded-2xl bg-amber-50/70 p-3">
      <input type="hidden" name="tramiteId" value={t.id} />
      <label className="block text-xs font-medium text-amber-800" htmlFor={`coment-${t.id}`}>
        ¿Qué hay que revisar?
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id={`coment-${t.id}`}
          name="notas"
          defaultValue={t.notas ?? ""}
          maxLength={4000}
          placeholder="Ej. le falta la firma del cónyuge"
          className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-tinta px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}

/** Botonera de estado: un toque, también desde el celular. */
function BotonesEstado({ t }: { t: Tramite }) {
  return (
    <div className="inline-flex gap-0.5 rounded-xl bg-slate-100 p-0.5">
      {ESTADOS_TRAMITE.map((e) => (
        <form key={e.id} action={cambiarEstadoTramite}>
          <input type="hidden" name="tramiteId" value={t.id} />
          <input type="hidden" name="estado" value={e.id} />
          <button
            type="submit"
            title={e.label}
            aria-label={`Marcar como ${e.label}`}
            aria-pressed={t.estado === e.id}
            className={`grid h-8 w-8 place-items-center rounded-lg text-sm transition-colors ${
              t.estado === e.id
                ? "bg-tinta text-white shadow-suave"
                : "text-slate-400 hover:bg-white hover:text-tinta"
            }`}
          >
            {e.icono}
          </button>
        </form>
      ))}
    </div>
  );
}

export function Expediente({
  tramites,
  propiedadId,
}: {
  tramites: Tramite[];
  propiedadId: string;
}) {
  return (
    <div className="space-y-4">
      {BLOQUES.map((b) => {
        // Los del cónyuge solo se ven si aplican (alguien es casado) o si ya
        // tienen algo subido. Para un soltero no existen.
        const items = tramites.filter(
          (t) =>
            t.catalogo.bloque === b.id &&
            !(esDeConyuge(t.catalogo.numero) && t.estado === "no_aplica" && t.documentos.length === 0)
        );
        if (items.length === 0) return null;
        const primeroDeConyuge = items.find((t) => t.catalogo.numero >= 34)?.id;

        const completos = items.filter((t) => t.estado === "completo").length;
        const aplicables = items.filter((t) => t.estado !== "no_aplica").length;

        return (
          <div
            key={b.id}
            className="overflow-hidden rounded-tarjeta bg-white shadow-suave ring-1 ring-black/[0.03]"
          >
            <div className="flex items-center justify-between border-b border-linea/60 px-6 pt-5 pb-3">
              <h3 className="text-sm font-semibold">
                <span className="mr-2 text-gold-600">{b.id}</span>
                {b.nombre}
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ({b.rango})
                </span>
              </h3>
              <span className="text-xs text-slate-500 tabular">
                {completos}/{aplicables}
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((t) => (
                <Fragment key={t.id}>
                  {t.id === primeroDeConyuge ? (
                    <li className="bg-fondo/70 px-6 py-2 text-xs font-semibold text-tenue">
                      {b.id === "A" ? "Cónyuge del vendedor" : "Cónyuge del comprador"}
                    </li>
                  ) : null}
                  <FilaTramite t={t} propiedadId={propiedadId} />
                </Fragment>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="text-xs text-slate-500">
        Leyenda: {ESTADOS_TRAMITE.map((e) => `${e.icono} ${e.label}`).join(" · ")}
      </p>
    </div>
  );
}
