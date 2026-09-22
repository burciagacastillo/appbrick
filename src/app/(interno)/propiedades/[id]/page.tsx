import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerPropiedad } from "@/lib/queries";
import { Card, CardHeader, EtapaBadge, Barra } from "@/components/ui";
import { Expediente } from "@/components/expediente";
import { TablaGastos } from "@/components/gastos";
import { Publicacion } from "@/components/publicacion";
import { guardarPropiedad } from "@/acciones/propiedades";
import { ETAPAS, TIPOS_PROPIEDAD, mxn, fechaCorta } from "@/lib/constants";
import { exigirAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "expediente", label: "Expediente" },
  { id: "gastos", label: "Gastos" },
  { id: "datos", label: "Datos" },
  { id: "publicar", label: "Publicar" },
] as const;

const inputCls =
  "mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-brick-700 dark:bg-brick-900";

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
    <div className="space-y-5">
      <div>
        <Link
          href="/propiedades"
          className="text-xs text-slate-500 hover:underline"
        >
          ← Propiedades
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{p.nombre}</h1>
          <EtapaBadge id={p.etapa} />
        </div>
        {p.direccion || p.colonia ? (
          <p className="text-sm text-slate-500">
            {[p.direccion, p.colonia, p.ciudad].filter(Boolean).join(", ")}
          </p>
        ) : null}
        {p.notas ? <p className="mt-1 text-sm text-slate-500">{p.notas}</p> : null}
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Expediente
          </div>
          <div className="mt-1 text-2xl font-semibold tabular">
            {p.progreso.porcentaje}%
          </div>
          <div className="mt-2">
            <Barra porcentaje={p.progreso.porcentaje} />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {p.progreso.completos} de {p.progreso.total} · {p.progreso.revisar} por
            revisar
          </div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Compra</div>
          <div className="mt-1 text-2xl font-semibold tabular">{mxn(p.valorCompra)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {p.fechaCompra ? fechaCorta(p.fechaCompra) : "Sin fecha"}
          </div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Gastado</div>
          <div className="mt-1 text-2xl font-semibold tabular">{mxn(p.dinero.gastado)}</div>
          <div className="mt-1 text-xs text-slate-500">{p.gastos.length} movimientos</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Margen estimado
          </div>
          <div
            className={`mt-1 text-2xl font-semibold tabular ${
              p.dinero.margen != null && p.dinero.margen < 0 ? "text-rose-600" : ""
            }`}
          >
            {mxn(p.dinero.margen)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {p.dinero.margen == null ? "Falta compra o venta estimada" : "Venta − compra − gastos"}
          </div>
        </Card>
      </div>

      {/* Pestañas (sin JS: navegación por query string) */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-brick-700">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/propiedades/${encodeURIComponent(p.id)}?tab=${t.id}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              tabActual === t.id
                ? "border-gold-500 font-medium text-brick-800 dark:text-gold-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tabActual === "expediente" ? <Expediente tramites={p.tramites} /> : null}

      {tabActual === "gastos" ? <TablaGastos propiedad={p} /> : null}

      {tabActual === "publicar" ? <Publicacion propiedad={p} /> : null}

      {tabActual === "datos" ? (
        <Card>
          <CardHeader titulo="Datos de la propiedad" />
          <form action={guardarPropiedad} className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            <input type="hidden" name="propiedadId" value={p.id} />

            <label className="text-xs">
              <span className="text-slate-500">Nombre</span>
              <input name="nombre" defaultValue={p.nombre} required className={inputCls} />
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Dirección</span>
              <input name="direccion" defaultValue={p.direccion ?? ""} className={inputCls} />
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Colonia</span>
              <input name="colonia" defaultValue={p.colonia ?? ""} className={inputCls} />
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Etapa</span>
              <select name="etapa" defaultValue={p.etapa} className={inputCls}>
                {ETAPAS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Tipo</span>
              <select name="tipo" defaultValue={p.tipo} className={inputCls}>
                {TIPOS_PROPIEDAD.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Fecha objetivo de cierre</span>
              <input
                type="date"
                name="fechaCierreObjetivo"
                defaultValue={
                  p.fechaCierreObjetivo
                    ? p.fechaCierreObjetivo.toISOString().slice(0, 10)
                    : ""
                }
                className={inputCls}
              />
            </label>

            <label className="text-xs">
              <span className="text-slate-500">Valor de compra</span>
              <input
                type="number"
                step="0.01"
                name="valorCompra"
                defaultValue={p.valorCompra ?? ""}
                className={`${inputCls} tabular`}
              />
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Venta estimada</span>
              <input
                type="number"
                step="0.01"
                name="valorVentaEstimado"
                defaultValue={p.valorVentaEstimado ?? ""}
                className={`${inputCls} tabular`}
              />
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Venta real</span>
              <input
                type="number"
                step="0.01"
                name="valorVentaReal"
                defaultValue={p.valorVentaReal ?? ""}
                className={`${inputCls} tabular`}
              />
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Presupuesto de obra</span>
              <input
                type="number"
                step="0.01"
                name="presupuestoObra"
                defaultValue={p.presupuestoObra ?? ""}
                className={`${inputCls} tabular`}
              />
            </label>

            <label className="text-xs sm:col-span-2">
              <span className="text-slate-500">
                Link de la carpeta en Drive (opcional)
              </span>
              <input
                name="carpetaDrive"
                defaultValue={p.carpetaDrive ?? ""}
                placeholder="https://drive.google.com/..."
                className={inputCls}
              />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="text-slate-500">Notas</span>
              <textarea
                name="notas"
                defaultValue={p.notas ?? ""}
                rows={3}
                className={inputCls}
              />
            </label>

            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-md bg-brick-800 px-4 py-2 text-sm font-medium text-white hover:bg-brick-700"
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
