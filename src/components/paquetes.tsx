import { CircleCheck, CircleDashed, CircleSlash, Download, FileText } from "lucide-react";
import { Badge, Card, BOTON_PRIMARIO } from "./ui";
import { PAQUETES, armarPaquete } from "@/lib/paquetes";
import type { PropiedadDetalle } from "@/lib/queries";

// Pestaña "Paquetes" de una propiedad: los documentos que alguien te pide
// juntos (el valuador), en SU orden, listos para bajar en un solo PDF.

export function Paquetes({ propiedad }: { propiedad: PropiedadDetalle }) {
  return (
    <div className="space-y-6">
      {PAQUETES.map((p) => {
        const piezas = armarPaquete(p, propiedad.tramites);
        const listas = piezas.filter((pz) => pz.documentos.length > 0).length;
        const aplicables = piezas.filter((pz) => !pz.noAplica).length;
        const sinRevisar = piezas.some((pz) => pz.documentos.some((d) => d.estado === "pendiente"));

        return (
          <Card key={p.id}>
            <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-5 pb-4">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">Paquete para {p.nombre.toLowerCase()}</h2>
                <p className="mt-0.5 max-w-md text-sm text-tenue">{p.descripcion}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tracking-tight tabular">
                  {listas}
                  <span className="text-base font-medium text-tenue">/{aplicables}</span>
                </div>
                <div className="text-xs text-tenue">listos</div>
              </div>
            </div>

            <ol className="px-3 pb-2">
              {piezas.map((pz, i) => {
                const lista = pz.documentos.length > 0;
                return (
                  <li
                    key={pz.numero}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${pz.noAplica ? "opacity-50" : ""}`}
                  >
                    <span className="w-5 shrink-0 text-right text-xs font-semibold text-slate-400 tabular">
                      {i + 1}
                    </span>
                    {pz.noAplica ? (
                      <CircleSlash className="h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={1.75} />
                    ) : lista ? (
                      <CircleCheck className="h-[18px] w-[18px] shrink-0 text-emerald-600" strokeWidth={1.75} />
                    ) : (
                      <CircleDashed className="h-[18px] w-[18px] shrink-0 text-slate-300" strokeWidth={1.75} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${lista ? "font-medium" : "text-tenue"}`}>
                        {pz.etiqueta}
                      </span>
                    </span>

                    {pz.noAplica ? (
                      <span className="text-xs text-tenue">No aplica</span>
                    ) : lista ? (
                      <span className="flex shrink-0 items-center gap-1.5">
                        {pz.documentos.some((d) => d.estado === "pendiente") ? (
                          <Badge color="amber">Sin revisar</Badge>
                        ) : null}
                        {pz.documentos.map((d, j) => (
                          <a
                            key={d.id}
                            href={`/api/documento/${d.id}`}
                            target="_blank"
                            rel="noreferrer"
                            title={d.nombreArchivo}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-tenue ring-1 ring-inset ring-linea transition-colors hover:bg-slate-50 hover:text-tinta"
                          >
                            <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {pz.documentos.length > 1 ? `Hoja ${j + 1}` : "Ver"}
                          </a>
                        ))}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs font-medium text-rose-500">Falta</span>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-wrap items-center gap-3 border-t border-linea/60 px-6 py-5">
              {listas > 0 ? (
                <a href={`/api/paquete/${encodeURIComponent(propiedad.id)}/${p.id}`} className={BOTON_PRIMARIO}>
                  <Download className="h-4 w-4" strokeWidth={1.75} />
                  Descargar PDF
                </a>
              ) : (
                <span className={`${BOTON_PRIMARIO} pointer-events-none opacity-40`}>
                  <Download className="h-4 w-4" strokeWidth={1.75} />
                  Descargar PDF
                </span>
              )}
              <p className="text-xs text-tenue">
                {listas === 0
                  ? "Todavía no hay ningún documento de esta lista."
                  : listas < aplicables
                    ? `Sale con ${listas} de ${aplicables}, en este orden. Los que faltan se brincan.`
                    : "Completo, en este orden."}
                {sinRevisar ? " Incluye documentos que aún no revisas." : ""}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
