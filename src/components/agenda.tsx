import Link from "next/link";
import { Check, FileClock, Flag, PenLine } from "lucide-react";
import { alternarPaso } from "@/acciones/pasos";
import type { Evento, TipoEvento } from "@/lib/agenda";

// Piezas de la agenda que comparten /agenda y el tablero de inicio.

const ESTILO: Record<Exclude<TipoEvento, "paso">, { icono: typeof Flag; color: string }> = {
  firma: { icono: PenLine, color: "text-indigo-600" },
  cierre: { icono: Flag, color: "text-teal-600" },
  vence: { icono: FileClock, color: "text-amber-600" },
};

/** El círculo de un paso es un botón: un toque y queda hecho. */
function IconoEvento({ e, atrasado }: { e: Evento; atrasado?: boolean }) {
  if (e.tipo === "paso" && e.pasoId) {
    return (
      <form action={alternarPaso} className="shrink-0">
        <input type="hidden" name="pasoId" value={e.pasoId} />
        <button
          type="submit"
          title={e.hecho ? "Regresar a pendiente" : "Marcar como hecho"}
          aria-label={e.hecho ? "Regresar a pendiente" : "Marcar como hecho"}
          className={`group grid h-5 w-5 place-items-center rounded-full transition-colors ${
            e.hecho ? "bg-tinta text-white" : atrasado ? "ring-1 ring-rose-400 hover:ring-rose-600" : "ring-1 ring-slate-300 hover:ring-tinta"
          }`}
        >
          <Check className={`h-3 w-3 ${e.hecho ? "" : "opacity-0 group-hover:opacity-100"}`} strokeWidth={2.5} />
        </button>
      </form>
    );
  }
  const { icono: Icono, color } = ESTILO[e.tipo as Exclude<TipoEvento, "paso">];
  return <Icono className={`h-5 w-5 shrink-0 ${atrasado ? "text-rose-600" : color}`} strokeWidth={1.75} />;
}

/** Un renglón: qué, de cuál propiedad, y (si se pide) cuándo. */
export function FilaEvento({ e, cuando, atrasado }: { e: Evento; cuando?: string; atrasado?: boolean }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <IconoEvento e={e} atrasado={atrasado} />
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${e.hecho ? "text-tenue line-through" : "font-medium"}`}>{e.titulo}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-tenue">
          <Link href={`/propiedades/${encodeURIComponent(e.propiedadId)}`} className="hover:text-tinta hover:underline">
            {e.propiedadNombre}
          </Link>
          {cuando ? <span className={atrasado ? "font-medium text-rose-600" : ""}>· {cuando}</span> : null}
          {e.hora ? <span>· {e.hora}</span> : null}
        </div>
      </div>
    </li>
  );
}
