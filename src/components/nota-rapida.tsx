"use client";

import { useActionState, useState } from "react";
import { guardarNotaRapida, type ResultadoNotaRapida } from "@/acciones/propiedades";
import { BotonCopiar } from "./copiar";
import { ErrorCampo } from "./ui";

// Nota rápida de la propiedad, arriba de su ficha: "darle prioridad porque…".
// Es el mismo campo de notas de la pestaña Datos, a la mano.

export function NotaRapida({ propiedadId, notas }: { propiedadId: string; notas: string }) {
  const [texto, setTexto] = useState(notas);
  const [estado, accion, pendiente] = useActionState<ResultadoNotaRapida, FormData>(
    guardarNotaRapida,
    null
  );
  const cambio = texto.trim() !== notas.trim();

  return (
    <form action={accion}>
      <input type="hidden" name="propiedadId" value={propiedadId} />
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`nota-${propiedadId}`} className="text-[13px] font-medium text-tenue">
          Nota rápida
        </label>
        <div className="flex items-center gap-1.5">
          {cambio ? (
            <button
              type="submit"
              disabled={pendiente}
              className="rounded-lg bg-tinta px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {pendiente ? "Guardando…" : "Guardar"}
            </button>
          ) : estado?.ok ? (
            <span className="text-xs text-emerald-700">Guardada</span>
          ) : null}
          <BotonCopiar texto={texto} etiqueta="la nota" />
        </div>
      </div>
      <textarea
        id={`nota-${propiedadId}`}
        name="notas"
        rows={2}
        maxLength={4000}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ej. Darle prioridad: el comprador ya tiene su preca y se le vence…"
        className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-fondo/60 px-3 py-2.5 text-sm text-tinta placeholder:text-slate-400 transition-colors focus:border-brick-600 focus:bg-white focus:ring-4 focus:ring-brick-600/10 focus:outline-none"
      />
      {estado?.ok === false ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
    </form>
  );
}
