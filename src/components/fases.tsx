import { Check } from "lucide-react";
import { Card, EtapaBadge } from "./ui";
import { ETAPAS, etapa as buscarEtapa } from "@/lib/constants";
import { cambiarEtapa } from "@/acciones/propiedades";

// Línea de fases de una propiedad: de la adquisición a la entrega. Cada punto
// es un botón — un toque la mueve de fase (y queda en la bitácora). Sin
// JavaScript: cada punto es un formulario.
//
// "Prospecto" y "Cancelada" no están en la línea: son antes y fuera del
// camino. Se eligen en la pestaña Datos.

export function LineaDeFases({ propiedadId, actual }: { propiedadId: string; actual: string }) {
  const camino = ETAPAS.filter((e) => e.enCamino);
  const indice = camino.findIndex((e) => e.id === actual);
  const fase = buscarEtapa(actual);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium text-tenue">Fase</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">{fase.label}</span>
            {indice === -1 ? <EtapaBadge id={actual} /> : null}
          </div>
          <p className="mt-0.5 text-sm text-tenue">{fase.desc}</p>
        </div>
        {indice >= 0 ? (
          <span className="text-xs text-tenue tabular">
            {indice + 1} de {camino.length}
          </span>
        ) : null}
      </div>

      <div className="-mx-2 mt-6 overflow-x-auto px-2 pb-1 [scrollbar-width:thin]">
        <ol className="flex min-w-[860px]">
          {camino.map((e, i) => {
            const hecha = indice > i;
            const esta = indice === i;
            return (
              <li key={e.id} className="relative flex flex-1 flex-col items-center">
                {/* Tramo hacia la siguiente fase. */}
                {i < camino.length - 1 ? (
                  <span
                    className={`absolute top-[15px] left-1/2 h-0.5 w-full ${
                      hecha ? "bg-tinta" : "bg-slate-200"
                    }`}
                  />
                ) : null}

                <form action={cambiarEtapa} className="relative z-10">
                  <input type="hidden" name="propiedadId" value={propiedadId} />
                  <input type="hidden" name="etapa" value={e.id} />
                  <button
                    type="submit"
                    disabled={esta}
                    title={esta ? `Fase actual: ${e.label}` : `Mover a: ${e.label}`}
                    aria-label={esta ? `Fase actual: ${e.label}` : `Mover a ${e.label}`}
                    aria-current={esta ? "step" : undefined}
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold tabular transition-all ${
                      esta
                        ? "bg-tinta text-white ring-4 ring-tinta/10"
                        : hecha
                          ? "bg-tinta text-white hover:bg-slate-700"
                          : "bg-white text-slate-400 ring-1 ring-slate-200 hover:text-tinta hover:ring-slate-400"
                    }`}
                  >
                    {hecha ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                  </button>
                </form>

                <span
                  className={`mt-2 px-1 text-center text-[11px] leading-tight ${
                    esta ? "font-semibold text-tinta" : hecha ? "text-tinta" : "text-slate-400"
                  }`}
                >
                  {e.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
