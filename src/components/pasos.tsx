import Link from "next/link";
import { CalendarDays, Check, FileClock, X } from "lucide-react";
import { Card, CardHeader, CLASE_CAMPO, BOTON_SECUNDARIO } from "./ui";
import { FormaPaso, type OpcionTramite } from "./forma-paso";
import { alternarPaso, borrarPaso, guardarFechasClave } from "@/acciones/pasos";
import { claveDia, etiquetaDia, etiquetaPaso, hoy, sumarDias } from "@/lib/agenda";
import { estadoTramite } from "@/lib/constants";
import type { PropiedadDetalle } from "@/lib/queries";

// Pasos y fechas clave de una propiedad: lo "tipo Asana" de AppBrick, en
// ligero. El primer pendiente es el "siguiente paso" (sale en la galería, en
// el tablero por fase y en la agenda). Las fechas clave salen solas en la
// agenda: firma, cierre objetivo y documentos que se vencen.

/** Documentos de esta propiedad que vencen en los próximos 30 días (o ya vencieron). */
function porVencer(p: PropiedadDetalle, hoyDia: string) {
  const limite = sumarDias(hoyDia, 30);
  const lista: { tramiteId: string; nombre: string; dia: string }[] = [];
  for (const t of p.tramites) {
    if (t.estado === "no_aplica") continue;
    // Vienen del más nuevo al más viejo: vale el último que subiste.
    const vigente = t.documentos.find((d) => d.estado !== "rechazado" && d.vigenciaHasta);
    if (!vigente?.vigenciaHasta) continue;
    const dia = claveDia(vigente.vigenciaHasta);
    if (dia <= limite) lista.push({ tramiteId: t.id, nombre: t.catalogo.nombre, dia });
  }
  return lista.sort((a, b) => a.dia.localeCompare(b.dia));
}

function Marca({ pasoId, hecho }: { pasoId: string; hecho: boolean }) {
  return (
    <form action={alternarPaso} className="shrink-0">
      <input type="hidden" name="pasoId" value={pasoId} />
      <button
        type="submit"
        title={hecho ? "Regresar a pendiente" : "Marcar como hecho"}
        aria-label={hecho ? "Regresar a pendiente" : "Marcar como hecho"}
        className={`group mt-0.5 grid h-5 w-5 place-items-center rounded-full transition-colors ${
          hecho ? "bg-tinta text-white" : "ring-1 ring-slate-300 hover:ring-tinta"
        }`}
      >
        <Check
          className={`h-3 w-3 ${hecho ? "" : "text-tinta opacity-0 group-hover:opacity-100"}`}
          strokeWidth={2.5}
        />
      </button>
    </form>
  );
}

export function PasosPropiedad({ propiedad: p }: { propiedad: PropiedadDetalle }) {
  const hoyDia = hoy();
  const abiertos = p.pasos.filter((x) => !x.hecho);
  const hechos = p.pasos.filter((x) => x.hecho);
  const vencen = porVencer(p, hoyDia);
  const tramites: OpcionTramite[] = p.tramites
    .filter((t) => !t.catalogo.esDato)
    .map((t) => ({ id: t.id, numero: t.catalogo.numero, nombre: t.catalogo.nombre }));
  const expediente = `/propiedades/${encodeURIComponent(p.id)}?tab=expediente`;

  return (
    <Card>
      <CardHeader
        titulo="Pasos"
        extra={
          <Link href="/agenda" className="text-xs text-tenue hover:text-tinta">
            Ver agenda →
          </Link>
        }
      />
      <div className="grid gap-8 px-6 pb-6 lg:grid-cols-3">
        {/* Pendientes */}
        <div className="min-w-0 lg:col-span-2">
          {abiertos.length === 0 ? (
            <p className="pb-3 text-sm text-tenue">Sin pendientes. Escribe abajo qué sigue.</p>
          ) : (
            <ul className="divide-y divide-slate-100 pb-2">
              {abiertos.map((paso, i) => {
                const dia = paso.fecha ? claveDia(paso.fecha) : null;
                const cuando = etiquetaPaso(dia, hoyDia);
                return (
                  <li key={paso.id} className="flex items-start gap-3 py-2.5">
                    <Marca pasoId={paso.id} hecho={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{paso.titulo}</span>
                        {i === 0 ? (
                          <span className="rounded-full bg-tinta px-2 py-px text-[11px] font-medium text-white">
                            Siguiente
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                        {cuando ? (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              cuando.atrasado ? "font-medium text-rose-600" : "text-tenue"
                            }`}
                          >
                            <CalendarDays className="h-3 w-3" strokeWidth={1.75} />
                            {cuando.texto}
                            {paso.hora ? ` · ${paso.hora}` : ""}
                          </span>
                        ) : null}
                        {paso.tramite && paso.tramiteId ? (
                          <Link href={`${expediente}#tramite-${paso.tramiteId}`} className="text-tenue hover:text-tinta">
                            #{paso.tramite.catalogo.numero} {paso.tramite.catalogo.nombre} ·{" "}
                            {estadoTramite(paso.tramite.estado).label}
                          </Link>
                        ) : null}
                      </div>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-slate-400 hover:text-tinta">Editar</summary>
                        <div className="mt-2">
                          <FormaPaso
                            propiedadId={p.id}
                            tramites={tramites}
                            paso={{
                              id: paso.id,
                              titulo: paso.titulo,
                              dia,
                              hora: paso.hora,
                              tramiteId: paso.tramiteId,
                            }}
                          />
                        </div>
                      </details>
                    </div>
                    <form action={borrarPaso} className="shrink-0">
                      <input type="hidden" name="pasoId" value={paso.id} />
                      <button
                        type="submit"
                        title="Borrar paso"
                        aria-label="Borrar paso"
                        className="text-slate-300 transition-colors hover:text-rose-600"
                      >
                        <X className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <FormaPaso propiedadId={p.id} tramites={tramites} />

          {hechos.length > 0 ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-tenue hover:text-tinta">
                Hechos ({hechos.length})
              </summary>
              <ul className="mt-2 space-y-1.5">
                {hechos.map((paso) => (
                  <li key={paso.id} className="flex items-center gap-3 text-sm text-tenue">
                    <Marca pasoId={paso.id} hecho />
                    <span className="min-w-0 flex-1 truncate line-through">{paso.titulo}</span>
                    {paso.hechoEn ? (
                      <span className="shrink-0 text-xs">{etiquetaDia(claveDia(paso.hechoEn), hoyDia)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        {/* Fechas clave: salen solas en la agenda */}
        <div className="min-w-0 space-y-5">
          <form action={guardarFechasClave} className="space-y-3">
            <input type="hidden" name="propiedadId" value={p.id} />
            <h3 className="text-[13px] font-semibold text-tinta">Fechas clave</h3>
            <label className="block text-xs">
              <span className="font-medium text-tenue">Firma programada</span>
              <input
                type="date"
                name="fechaFirmaProgramada"
                defaultValue={p.fechaFirmaProgramada ? claveDia(p.fechaFirmaProgramada) : ""}
                className={CLASE_CAMPO}
              />
            </label>
            <label className="block text-xs">
              <span className="font-medium text-tenue">Cierre objetivo</span>
              <input
                type="date"
                name="fechaCierreObjetivo"
                defaultValue={p.fechaCierreObjetivo ? claveDia(p.fechaCierreObjetivo) : ""}
                className={CLASE_CAMPO}
              />
            </label>
            <button type="submit" className={BOTON_SECUNDARIO}>
              Guardar fechas
            </button>
          </form>

          <div>
            <h3 className="text-[13px] font-semibold text-tinta">Documentos por vencer</h3>
            {vencen.length === 0 ? (
              <p className="mt-1 text-xs text-tenue">Nada vence en los próximos 30 días.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {vencen.map((v) => {
                  const cuando = etiquetaPaso(v.dia, hoyDia)!;
                  return (
                    <li key={v.tramiteId} className="flex items-start gap-2 text-sm">
                      <FileClock
                        className={`mt-0.5 h-4 w-4 shrink-0 ${cuando.atrasado ? "text-rose-600" : "text-amber-600"}`}
                        strokeWidth={1.75}
                      />
                      <Link href={`${expediente}#tramite-${v.tramiteId}`} className="min-w-0 hover:underline">
                        {v.nombre}
                        <span className={`block text-xs ${cuando.atrasado ? "text-rose-600" : "text-tenue"}`}>
                          {cuando.atrasado ? cuando.texto : `Vence ${cuando.texto.toLowerCase()}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
