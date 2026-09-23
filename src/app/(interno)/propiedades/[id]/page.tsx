import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerPropiedad } from "@/lib/queries";
import { ChevronLeft } from "lucide-react";
import { Card, CardHeader, EtapaBadge, Barra, CLASE_CAMPO, Stat } from "@/components/ui";
import { Expediente } from "@/components/expediente";
import { LineaDeFases } from "@/components/fases";
import { Paquetes } from "@/components/paquetes";
import { TablaGastos } from "@/components/gastos";
import { Publicacion } from "@/components/publicacion";
import { Personas } from "@/components/personas";
import { guardarPropiedad } from "@/acciones/propiedades";
import { ETAPAS, TIPOS_PROPIEDAD, mxn, fechaCorta } from "@/lib/constants";
import { exigirAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "expediente", label: "Expediente" },
  { id: "personas", label: "Personas" },
  { id: "gastos", label: "Gastos" },
  { id: "datos", label: "Datos" },
  { id: "paquetes", label: "Paquetes" },
  { id: "publicar", label: "Publicar" },
] as const;


export default async function DetallePropiedad({
  params,
  searchParams,
}: PageProps<"/propiedades/[id]">) {
  await exigirAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const tabActual = typeof sp.tab === "string" ? sp.tab : "expediente";

  const p = await obtenerPropiedad(id);
  if (!p) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/propiedades"
          className="inline-flex items-center gap-1 text-sm text-tenue transition-colors hover:text-tinta"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          Propiedades
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">{p.nombre}</h1>
          <EtapaBadge id={p.etapa} />
        </div>
        {p.direccion || p.colonia ? (
          <p className="mt-1 text-sm text-tenue">
            {[p.direccion, p.colonia, p.ciudad].filter(Boolean).join(", ")}
          </p>
        ) : null}
        {p.notas ? <p className="mt-2 max-w-2xl text-sm text-tenue">{p.notas}</p> : null}
      </div>

      <LineaDeFases propiedadId={p.id} actual={p.etapa} />

      {/* Resumen rápido */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="px-6 py-5">
          <div className="text-[13px] font-medium text-tenue">Expediente</div>
          <div className="mt-3 text-[30px] leading-none font-bold tracking-tight tabular">
            {p.progreso.porcentaje}%
          </div>
          <div className="mt-4">
            <Barra porcentaje={p.progreso.porcentaje} />
          </div>
          <div className="mt-2 text-xs text-tenue">
            {p.progreso.completos} de {p.progreso.total} · {p.progreso.revisar} por revisar
          </div>
        </Card>
        <Stat
          label="Compra"
          valor={mxn(p.valorCompra)}
          sub={p.fechaCompra ? fechaCorta(p.fechaCompra) : "Sin fecha"}
        />
        <Stat
          label="Gastado"
          valor={mxn(p.dinero.gastado)}
          sub={`${p.gastos.length} movimientos`}
        />
        <Stat
          label="Margen estimado"
          valor={mxn(p.dinero.margen)}
          insignia={
            p.dinero.margen != null && p.valorCompra
              ? `${p.dinero.margen >= 0 ? "+" : ""}${Math.round(
                  (p.dinero.margen / (p.valorCompra + p.dinero.gastado)) * 100
                )}%`
              : undefined
          }
          tono={p.dinero.margen != null && p.dinero.margen < 0 ? "alerta" : "bien"}
          sub={p.dinero.margen == null ? "Falta compra o venta estimada" : "Venta − compra − gastos"}
        />
      </div>

      {/* Pestañas como control segmentado (sin JS: navegación por query string) */}
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
        <div className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-suave ring-1 ring-black/[0.03]">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/propiedades/${encodeURIComponent(p.id)}?tab=${t.id}`}
              aria-current={tabActual === t.id ? "page" : undefined}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                tabActual === t.id
                  ? "bg-tinta text-white"
                  : "text-tenue hover:bg-slate-50 hover:text-tinta"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {tabActual === "expediente" ? (
        <Expediente tramites={p.tramites} propiedadId={p.id} />
      ) : null}

      {tabActual === "personas" ? <Personas propiedad={p} /> : null}

      {tabActual === "gastos" ? <TablaGastos propiedad={p} /> : null}

      {tabActual === "paquetes" ? <Paquetes propiedad={p} /> : null}

      {tabActual === "publicar" ? <Publicacion propiedad={p} /> : null}

      {tabActual === "datos" ? (
        <Card>
          <CardHeader titulo="Datos de la propiedad" />
          <form action={guardarPropiedad} className="grid gap-4 px-6 pt-1 pb-6 sm:grid-cols-2">
            <input type="hidden" name="propiedadId" value={p.id} />

            <label className="text-xs">
              <span className="font-medium text-tenue">Nombre</span>
              <input name="nombre" defaultValue={p.nombre} required className={CLASE_CAMPO} />
            </label>
            <label className="text-xs">
              <span className="font-medium text-tenue">Dirección</span>
              <input name="direccion" defaultValue={p.direccion ?? ""} className={CLASE_CAMPO} />
            </label>
            <label className="text-xs">
              <span className="font-medium text-tenue">Colonia</span>
              <input name="colonia" defaultValue={p.colonia ?? ""} className={CLASE_CAMPO} />
            </label>
            <label className="text-xs">
              <span className="font-medium text-tenue">Etapa</span>
              <select name="etapa" defaultValue={p.etapa} className={CLASE_CAMPO}>
                {ETAPAS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="font-medium text-tenue">Tipo</span>
              <select name="tipo" defaultValue={p.tipo} className={CLASE_CAMPO}>
                {TIPOS_PROPIEDAD.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="font-medium text-tenue">Fecha objetivo de cierre</span>
              <input
                type="date"
                name="fechaCierreObjetivo"
                defaultValue={
                  p.fechaCierreObjetivo
                    ? p.fechaCierreObjetivo.toISOString().slice(0, 10)
                    : ""
                }
                className={CLASE_CAMPO}
              />
            </label>

            <label className="text-xs">
              <span className="font-medium text-tenue">Valor de compra</span>
              <input
                type="number"
                step="0.01"
                name="valorCompra"
                defaultValue={p.valorCompra ?? ""}
                className={`${CLASE_CAMPO} tabular`}
              />
            </label>
            <label className="text-xs">
              <span className="font-medium text-tenue">Venta estimada</span>
              <input
                type="number"
                step="0.01"
                name="valorVentaEstimado"
                defaultValue={p.valorVentaEstimado ?? ""}
                className={`${CLASE_CAMPO} tabular`}
              />
            </label>
            <label className="text-xs">
              <span className="font-medium text-tenue">Venta real</span>
              <input
                type="number"
                step="0.01"
                name="valorVentaReal"
                defaultValue={p.valorVentaReal ?? ""}
                className={`${CLASE_CAMPO} tabular`}
              />
            </label>
            <label className="text-xs">
              <span className="font-medium text-tenue">Presupuesto de obra</span>
              <input
                type="number"
                step="0.01"
                name="presupuestoObra"
                defaultValue={p.presupuestoObra ?? ""}
                className={`${CLASE_CAMPO} tabular`}
              />
            </label>

            <label className="text-xs sm:col-span-2">
              <span className="font-medium text-tenue">
                Link de la carpeta en Drive (opcional)
              </span>
              <input
                name="carpetaDrive"
                defaultValue={p.carpetaDrive ?? ""}
                placeholder="https://drive.google.com/..."
                className={CLASE_CAMPO}
              />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="font-medium text-tenue">Notas</span>
              <textarea
                name="notas"
                defaultValue={p.notas ?? ""}
                rows={3}
                className={CLASE_CAMPO}
              />
            </label>

            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-xl bg-tinta px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Guardar
              </button>
              {p.carpetaLocal ? (
                <span className="truncate font-mono text-xs text-slate-400">
                  {p.carpetaLocal}
                </span>
              ) : null}
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
