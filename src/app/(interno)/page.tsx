import Link from "next/link";
import { resumenGeneral, tramitesAtorados, listarPropiedades } from "@/lib/queries";
import { Card, CardHeader, Stat, Badge, EtapaBadge, Barra, Vacio } from "@/components/ui";
import { mxn, fechaCorta } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Tablero() {
  const [resumen, atorados, propiedades] = await Promise.all([
    resumenGeneral(),
    tramitesAtorados(),
    listarPropiedades(),
  ]);

  const activas = propiedades.filter(
    (p) => p.etapa !== "concluida" && p.etapa !== "cancelada"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tablero</h1>
        <p className="text-sm text-slate-500">
          {resumen.activas} propiedades activas · {resumen.tramitesPendientes} trámites
          marcados para revisar
        </p>
      </div>

      {/* Los números de arriba */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Invertido"
          valor={mxn(resumen.invertido)}
          sub="Compra + gastos de las activas"
        />
        <Stat
          label="Valor esperado"
          valor={mxn(resumen.valorEsperado)}
          sub="Venta estimada de las activas"
        />
        <Stat
          label="Margen esperado"
          valor={resumen.margenEsperado === null ? "—" : mxn(resumen.margenEsperado)}
          sub={
            resumen.margenEsperado === null
              ? "Falta capturar valores"
              : "Antes de impuestos"
          }
          tono={
            resumen.margenEsperado === null
              ? "normal"
              : resumen.margenEsperado > 0
                ? "bien"
                : "alerta"
          }
        />
        <Stat
          label="Requieren atención"
          valor={resumen.tramitesVencidos + resumen.pagosSinComprobante}
          sub={`${resumen.tramitesVencidos} vencidos · ${resumen.pagosSinComprobante} pagos sin comprobante`}
          tono={
            resumen.tramitesVencidos + resumen.pagosSinComprobante > 0 ? "alerta" : "bien"
          }
        />
      </div>

      {/* Lo que hay que empujar hoy */}
      <Card>
        <CardHeader
          titulo="Qué empujar hoy"
          extra={
            <span className="text-xs text-slate-500">
              {atorados.length} trámites abiertos
            </span>
          }
        />
        {atorados.length === 0 ? (
          <Vacio>Nada atorado. O ya te pusiste al corriente, o falta capturar.</Vacio>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-brick-700">
            {atorados.slice(0, 12).map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 w-7 shrink-0 text-right text-xs font-semibold text-slate-400 tabular">
                  {t.catalogo.numero}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{t.catalogo.nombre}</span>
                    {t.vencido ? <Badge color="rose">Vencido</Badge> : null}
                    {t.pagoIncompleto ? (
                      <Badge color="amber">Pagado sin comprobante</Badge>
                    ) : null}
                    {t.estado === "revisar" ? <Badge color="amber">Revisar</Badge> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    <Link
                      href={`/propiedades/${encodeURIComponent(t.propiedad.id)}`}
                      className="font-medium text-brick-700 hover:underline dark:text-gold-400"
                    >
                      {t.propiedad.nombre}
                    </Link>
                    {t.responsable ? <> · {t.responsable}</> : null}
                    {t.fechaLimite ? <> · límite {fechaCorta(t.fechaLimite)}</> : null}
                    {t.catalogo.dondeSeTramita ? <> · {t.catalogo.dondeSeTramita}</> : null}
                  </div>
                  {t.notas ? (
                    <p className="mt-1 text-xs text-slate-500 italic">{t.notas}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {atorados.length > 12 ? (
          <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500 dark:border-brick-700">
            y {atorados.length - 12} más — entra a cada propiedad para verlos
          </div>
        ) : null}
      </Card>

      {/* Estado de cada propiedad activa */}
      <Card>
        <CardHeader titulo="Propiedades activas" />
        {activas.length === 0 ? (
          <Vacio>No hay propiedades activas.</Vacio>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-brick-700">
            {activas.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/propiedades/${encodeURIComponent(p.id)}`}
                  className="block px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-brick-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.nombre}</span>
                      <EtapaBadge id={p.etapa} />
                    </div>
                    <div className="text-xs text-slate-500 tabular">
                      Gastado {mxn(p.dinero.gastado)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <Barra porcentaje={p.progreso.porcentaje} />
                    </div>
                    <span className="w-32 shrink-0 text-right text-xs text-slate-500 tabular">
                      {p.progreso.completos}/{p.progreso.total} docs ·{" "}
                      {p.progreso.porcentaje}%
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
