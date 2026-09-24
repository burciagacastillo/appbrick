"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, FileText, Search, X } from "lucide-react";
import { buscarEnExpediente, type ItemBuscable } from "@/lib/buscar-expediente";

export type { ItemBuscable };

// Buscador dentro de una propiedad: "zoni", "predial", "constancias de
// zonificación", "21"… y sale el trámite con su archivo para abrirlo (e
// imprimirlo desde ahí), sin bajar por los 33 del expediente.

const ETIQUETA_ESTADO: Record<string, { texto: string; clase: string }> = {
  completo: { texto: "Completo", clase: "bg-[#e6f4ea] text-emerald-700" },
  revisar: { texto: "Revisar", clase: "bg-amber-50 text-amber-700" },
  falta: { texto: "Falta", clase: "bg-rose-50 text-rose-600" },
  no_aplica: { texto: "No aplica", clase: "bg-slate-100 text-tenue" },
};

export function BuscadorExpediente({
  propiedadId,
  items,
}: {
  propiedadId: string;
  items: ItemBuscable[];
}) {
  const [texto, setTexto] = useState("");

  const resultados = useMemo(() => buscarEnExpediente(items, texto), [texto, items]);

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Buscar en esta propiedad</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar en esta propiedad: zonificación, predial, INE…"
          className="w-full rounded-2xl border-0 bg-white py-3.5 pr-11 pl-11 text-sm text-tinta shadow-suave ring-1 ring-black/[0.03] placeholder:text-slate-400 focus:ring-4 focus:ring-brick-600/10 focus:outline-none"
        />
        {texto ? (
          <button
            type="button"
            onClick={() => setTexto("")}
            aria-label="Borrar búsqueda"
            className="absolute top-1/2 right-3 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-tinta"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : null}
      </label>

      {texto.trim() ? (
        <div className="mt-2 rounded-2xl bg-white p-2 shadow-flotante ring-1 ring-black/[0.04]">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-tenue">Nada con “{texto.trim()}”.</p>
          ) : (
            <ul>
              {resultados.map((r) => {
                const estado = ETIQUETA_ESTADO[r.estado] ?? ETIQUETA_ESTADO.falta;
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2.5 hover:bg-slate-50"
                  >
                    <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-400 tabular">
                      {r.numero}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium">{r.nombre}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estado.clase}`}>
                      {estado.texto}
                    </span>

                    <span className="flex w-full flex-wrap gap-1.5 pl-9 sm:w-auto sm:pl-0">
                      {r.documentos.length > 0 ? (
                        r.documentos.map((d) => (
                          <a
                            key={d.id}
                            href={`/api/documento/${d.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-tinta px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                          >
                            <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {d.etiqueta}
                            <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
                          </a>
                        ))
                      ) : r.esDato ? (
                        <a
                          href={`/propiedades/${encodeURIComponent(propiedadId)}?tab=personas`}
                          className="text-xs text-tenue hover:text-tinta"
                        >
                          Se captura en Personas →
                        </a>
                      ) : (
                        <a
                          href={`/propiedades/${encodeURIComponent(propiedadId)}?tab=expediente#tramite-${r.id}`}
                          className="text-xs text-tenue hover:text-tinta"
                        >
                          Sin archivo · subirlo →
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {resultados.some((r) => r.documentos.length > 0) ? (
            <p className="px-3 pt-1 pb-1.5 text-[11px] text-slate-400">
              Se abre en otra pestaña; desde ahí lo imprimes.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
