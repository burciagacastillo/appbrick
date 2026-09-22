"use client";

import { useActionState, useRef } from "react";
import { subirDocumento, type ResultadoSubida } from "./actions";

// Único componente de cliente de la app. Existe por una razón concreta:
// el invitado está en la calle, con señal mala, subiendo una foto de 4 MB.
// Sin retroalimentación inmediata vuelve a picarle al botón tres veces y
// sube el mismo documento tres veces.

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

  return (
    <form action={accion} className="mt-2">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="tramiteId" value={tramiteId} />

      <input
        ref={inputRef}
        type="file"
        name="archivo"
        required
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        disabled={pendiente}
        // En celular, esto abre directo la cámara o la galería.
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0
                   file:bg-brick-800 file:px-3 file:py-2 file:text-sm
                   file:font-medium file:text-white hover:file:bg-brick-700
                   disabled:opacity-50"
        onChange={(e) => {
          // Enviar en cuanto elige el archivo: un toque menos en el celular.
          if (e.target.files?.length) e.target.form?.requestSubmit();
        }}
      />

      {pendiente ? (
        <p className="mt-2 text-sm text-brick-700 dark:text-gold-400">
          Subiendo… no cierres esta pantalla.
        </p>
      ) : null}

      {!pendiente && estado?.ok === true ? (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
          {estado.mensaje}
        </p>
      ) : null}

      {!pendiente && estado?.ok === false ? (
        <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">{estado.error}</p>
      ) : null}

      {yaSubido && !pendiente && !estado ? (
        <p className="mt-1 text-xs text-slate-500">
          Si subiste el equivocado, puedes subir otro y se reemplaza.
        </p>
      ) : null}
    </form>
  );
}
