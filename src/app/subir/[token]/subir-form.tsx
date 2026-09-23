"use client";

import { useActionState, useRef, useState } from "react";
import { CircleAlert, CircleCheck, CloudUpload, LoaderCircle } from "lucide-react";
import { subirDocumento, type ResultadoSubida } from "./actions";

// Zona de carga del invitado. Es de cliente por una razón concreta: el
// invitado está en la calle, con señal mala, subiendo una foto de 4 MB. Sin
// retroalimentación inmediata vuelve a picarle tres veces y sube el mismo
// documento tres veces.
//
// En celular se toca y abre cámara o galería; en computadora también se
// puede arrastrar el archivo. En los dos casos se manda solo al elegirlo.

export function SubirForm({
  token,
  tramiteId,
  yaSubido,
}: {
  token: string;
  tramiteId: string;
  yaSubido: boolean;
}) {
  const [estado, accion, pendiente] = useActionState<ResultadoSubida | null, FormData>(
    subirDocumento,
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [nombre, setNombre] = useState<string | null>(null);

  const aceptado = !pendiente && estado?.ok === true;
  const fallo = !pendiente && estado?.ok === false;

  function enviar(archivos: FileList | null) {
    if (!archivos?.length || !inputRef.current) return;
    setNombre(archivos[0].name);
    // Enviar en cuanto elige el archivo: un toque menos en el celular.
    inputRef.current.form?.requestSubmit();
  }

  const zona = pendiente
    ? "border-brick-600/40 bg-brick-50"
    : aceptado
      ? "border-emerald-300 bg-emerald-50"
      : fallo
        ? "border-rose-300 bg-rose-50/60"
        : encima
          ? "border-brick-600 bg-brick-50 scale-[1.01]"
          : "border-slate-300 bg-fondo/60 hover:border-slate-400 hover:bg-fondo";

  return (
    <form action={accion} className="mt-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="tramiteId" value={tramiteId} />

      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!pendiente) setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          if (pendiente || !inputRef.current || !e.dataTransfer.files.length) return;
          inputRef.current.files = e.dataTransfer.files;
          enviar(e.dataTransfer.files);
        }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-all duration-200 ${zona} ${
          pendiente ? "pointer-events-none" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          name="archivo"
          required
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          disabled={pendiente}
          className="sr-only"
          onChange={(e) => enviar(e.target.files)}
        />

        {pendiente ? (
          <>
            <LoaderCircle className="h-7 w-7 animate-spin text-brick-700" strokeWidth={1.75} />
            <span className="text-sm font-medium text-tinta">Subiendo…</span>
            <span className="text-xs text-tenue">No cierres esta pantalla</span>
          </>
        ) : aceptado ? (
          <>
            <CircleCheck className="h-7 w-7 text-emerald-600" strokeWidth={1.75} />
            <span className="text-sm font-medium text-emerald-800">{estado.mensaje}</span>
            {nombre ? <span className="max-w-full truncate text-xs text-emerald-700/80">{nombre}</span> : null}
          </>
        ) : fallo ? (
          <>
            <CircleAlert className="h-7 w-7 text-rose-600" strokeWidth={1.75} />
            <span className="text-sm font-medium text-rose-700">{estado.error}</span>
            <span className="text-xs text-tenue">Toca para intentar otra vez</span>
          </>
        ) : (
          <>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-suave ring-1 ring-black/[0.04]">
              <CloudUpload className="h-5 w-5 text-tinta" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium text-tinta">
              {yaSubido ? "Subir otro para reemplazarlo" : "Toma una foto o elige el archivo"}
            </span>
            <span className="text-xs text-tenue">
              Foto o PDF<span className="hidden sm:inline"> · también puedes arrastrarlo aquí</span>
            </span>
          </>
        )}
      </label>
    </form>
  );
}
