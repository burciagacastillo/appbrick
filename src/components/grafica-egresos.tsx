"use client";

import { useState } from "react";
import { mxnCorto } from "@/lib/constants";

// Flujo de egresos mensual. Una sola serie, así que no lleva leyenda: el
// título de la tarjeta dice qué se grafica.
//
// Todas las barras en gris claro; UNA encendida en el acento: el mes actual
// por defecto, o la que señales con el cursor o el teclado. El monto exacto
// sale en un marcador flotante sobre la barra encendida — y además en la
// tabla de abajo, para que nunca dependa solo del cursor.

export type MesGrafica = { clave: string; etiqueta: string; etiquetaLarga: string; total: number };

const PESOS = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** Techo "redondo" para el eje: 1, 2, 2.5 o 5 por potencia de 10. */
function techoRedondo(n: number): number {
  if (n <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(n));
  for (const paso of [1, 2, 2.5, 5, 10]) {
    if (paso * potencia >= n) return paso * potencia;
  }
  return 10 * potencia;
}

export function GraficaEgresos({ meses }: { meses: MesGrafica[] }) {
  const actual = meses.length - 1;
  const [encendida, setEncendida] = useState(actual);

  const techo = techoRedondo(Math.max(...meses.map((m) => m.total)));
  const marcas = [techo, techo / 2, 0];

  return (
    <div>
      <div className="flex gap-3" onMouseLeave={() => setEncendida(actual)}>
        {/* Eje: tres marcas redondas, sin línea propia. */}
        <div className="relative h-56 w-12 shrink-0 text-right text-[11px] text-slate-400 tabular">
          {marcas.map((m, i) => (
            <span
              key={m}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(i / (marcas.length - 1)) * 100}%` }}
            >
              {mxnCorto(m)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            {/* Líneas guía: hairline, casi invisibles. */}
            {marcas.map((m, i) => (
              <div
                key={m}
                className="absolute inset-x-0 border-t border-slate-100"
                style={{ top: `${(i / (marcas.length - 1)) * 100}%` }}
              />
            ))}

            <div className="relative flex h-full items-end gap-1.5 sm:gap-2.5">
              {meses.map((m, i) => {
                const alto = (m.total / techo) * 100;
                const esta = i === encendida;
                return (
                  <div
                    key={m.clave}
                    tabIndex={0}
                    onMouseEnter={() => setEncendida(i)}
                    onFocus={() => setEncendida(i)}
                    onBlur={() => setEncendida(actual)}
                    aria-label={`${m.etiquetaLarga}: ${PESOS.format(m.total)}`}
                    className="relative flex h-full flex-1 cursor-default items-end justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-acento/40"
                  >
                    {esta ? (
                      <div
                        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-tinta px-3 py-1.5 text-center shadow-flotante"
                        style={{ bottom: `calc(${Math.max(alto, 1)}% + 10px)` }}
                      >
                        <div className="text-[11px] text-slate-400">{m.etiquetaLarga}</div>
                        <div className="text-sm font-semibold text-white tabular">
                          {PESOS.format(m.total)}
                        </div>
                      </div>
                    ) : null}

                    <div
                      className={`w-full max-w-[44px] rounded-t-lg transition-colors duration-200 ${
                        esta ? "bg-acento" : "bg-slate-200"
                      }`}
                      // Un mes en cero deja una rayita en la base: se ve que existe.
                      style={{ height: m.total > 0 ? `${Math.max(alto, 1.5)}%` : "2px" }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex gap-1.5 sm:gap-2.5">
            {meses.map((m, i) => (
              <div
                key={m.clave}
                className={`flex-1 text-center text-[11px] capitalize ${
                  i === encendida ? "font-semibold text-tinta" : "text-slate-400"
                }`}
              >
                {m.etiqueta}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* La misma información, sin depender del cursor. */}
      <details className="mt-5 group">
        <summary className="cursor-pointer text-xs font-medium text-tenue hover:text-tinta">
          <span className="group-open:hidden">Ver como tabla</span>
          <span className="hidden group-open:inline">Ocultar tabla</span>
        </summary>
        <table className="mt-3 w-full max-w-sm text-sm">
          <tbody>
            {meses.map((m) => (
              <tr key={m.clave} className="border-t border-slate-100">
                <td className="py-1.5 capitalize text-tenue">{m.etiquetaLarga}</td>
                <td className="py-1.5 text-right tabular">{PESOS.format(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
