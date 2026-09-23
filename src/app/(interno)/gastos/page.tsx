import Link from "next/link";
import { Hammer, KeyRound, Plus, Receipt, Stamp, Tag, Wallet, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { cuentaEntreSocios, egresosPorMes, totalesDeGastos } from "@/lib/queries";
import { Card, CardHeader, Encabezado, Stat, Vacio, BOTON_PRIMARIO } from "@/components/ui";
import { GraficaEgresos } from "@/components/grafica-egresos";
import { FormaGasto } from "@/components/formularios";
import { mxn, fechaCorta, labelCategoria, categoriaGasto } from "@/lib/constants";
import { exigirAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

// Libro de gastos de TODO el negocio. Los gastos se capturan dentro de cada
// propiedad (o aquí mismo, eligiéndola); esta pantalla los junta.

const MOSTRAR = 60;

/** Un ícono por grupo de categoría: se identifica el tipo de gasto de reojo. */
const ICONO_GRUPO: Record<string, LucideIcon> = {
  Adquisición: KeyRound,
  Trámites: Stamp,
  Obra: Hammer,
  Venta: Tag,
  Otro: Receipt,
};

const MES_CORTO = new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" });
const MES_LARGO = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function Gastos() {
  await exigirAdmin();

  // Los totales se calculan en la base sobre TODOS los movimientos. La lista
  // enseña solo los últimos; antes se sumaba la lista y se presentaba como
  // total, así que con muchos gastos reportaba de menos.
  const [totales, gastos, socios, meses, propiedades] = await Promise.all([
    totalesDeGastos(),
    db.gasto.findMany({
      include: { pagadoPor: true, propiedad: { select: { id: true, nombre: true } } },
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      take: MOSTRAR,
    }),
    cuentaEntreSocios(),
    egresosPorMes(12),
    db.propiedad.findMany({
      where: { etapa: { not: "cancelada" } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const ranking = totales.ranking;
  const mayor = ranking[0]?.monto ?? 1;
  const hayMas = totales.cuantos > gastos.length;

  const esteMes = meses[meses.length - 1].total;
  const mesPasado = meses[meses.length - 2]?.total ?? 0;
  const cambio = mesPasado > 0 ? Math.round(((esteMes - mesPasado) / mesPasado) * 100) : null;
  const conGasto = meses.filter((m) => m.total > 0);
  const promedio = conGasto.length
    ? conGasto.reduce((s, m) => s + m.total, 0) / conGasto.length
    : 0;

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Gastos"
        descripcion={`${totales.cuantos} movimientos en todas las propiedades`}
        acciones={
          <a href="#registrar" className={BOTON_PRIMARIO}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Registrar gasto
          </a>
        }
      />

      {totales.cuantos === 0 ? (
        <Card>
          <Vacio icono={<Wallet className="h-6 w-6" strokeWidth={1.5} />} titulo="Todavía no hay gastos">
            Captúralos abajo o dentro de cada propiedad. Aquí se juntan todos.
          </Vacio>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total histórico" valor={mxn(totales.total)} />
            <Stat
              label={`En ${MES_LARGO.format(meses[meses.length - 1].inicio)}`}
              valor={mxn(esteMes)}
              insignia={
                cambio === null ? undefined : `${cambio > 0 ? "+" : ""}${cambio}% vs mes pasado`
              }
              tono="neutro"
            />
            <Stat
              label="Promedio mensual"
              valor={mxn(promedio)}
              sub={`${conGasto.length} ${conGasto.length === 1 ? "mes" : "meses"} con gasto en el último año`}
            />
          </div>

          <Card className="p-6">
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight">Flujo de egresos</h2>
                <p className="mt-0.5 text-xs text-tenue">Últimos 12 meses, todo el negocio</p>
              </div>
              <span className="text-sm font-semibold tabular">
                {mxn(meses.reduce((s, m) => s + m.total, 0))}
              </span>
            </div>
            <GraficaEgresos
              meses={meses.map((m) => ({
                clave: m.clave,
                etiqueta: MES_CORTO.format(m.inicio).replace(".", ""),
                etiquetaLarga: MES_LARGO.format(m.inicio),
                total: m.total,
              }))}
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                titulo="Movimientos"
                extra={
                  <span className="text-xs text-tenue">
                    {hayMas ? `Últimos ${MOSTRAR} de ${totales.cuantos}` : `${totales.cuantos}`}
                  </span>
                }
              />
              <ul className="px-3 pb-3">
                {gastos.map((g) => {
                  const Icono = ICONO_GRUPO[categoriaGasto(g.categoria)?.grupo ?? "Otro"] ?? Receipt;
                  return (
                    <li key={g.id}>
                      <Link
                        href={`/propiedades/${encodeURIComponent(g.propiedad.id)}?tab=gastos`}
                        className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-tinta">
                          <Icono className="h-[18px] w-[18px]" strokeWidth={1.6} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{g.descripcion}</span>
                          <span className="block truncate text-xs text-tenue">
                            {g.propiedad.nombre} · {labelCategoria(g.categoria)}
                            {g.pagadoPor ? ` · pagó ${g.pagadoPor.nombre}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold tabular">{mxn(g.monto)}</span>
                          <span className="block text-xs text-tenue">{fechaCorta(g.fecha)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader titulo="En qué se va" />
                <ul className="space-y-4 px-6 pb-6">
                  {ranking.map((c) => (
                    <li key={c.categoria}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{labelCategoria(c.categoria)}</span>
                        <span className="shrink-0 font-medium tabular">{mxn(c.monto)}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brick-800"
                          style={{ width: `${(c.monto / mayor) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader titulo="Cuenta entre socios" />
                {socios.length === 0 ? (
                  <Vacio>
                    Ningún gasto trae quién pagó. Llena ese campo al capturar y
                    aquí se arma la cuenta sola.
                  </Vacio>
                ) : (
                  <ul className="space-y-4 px-6 pb-6">
                    {socios.map((s) => (
                      <li key={s.nombre}>
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold">
                            {s.nombre.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.nombre}</span>
                          <span className="text-sm font-semibold tabular">{mxn(s.total)}</span>
                        </div>
                        <ul className="mt-1.5 space-y-0.5 pl-11">
                          {s.porPropiedad.map((pp) => (
                            <li key={pp.nombre} className="flex justify-between gap-3 text-xs text-tenue">
                              <span className="truncate">{pp.nombre}</span>
                              <span className="tabular">{mxn(pp.monto)}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      <div id="registrar" className="scroll-mt-24">
        <Card>
          <CardHeader titulo="Registrar gasto" />
          {propiedades.length === 0 ? (
            <Vacio>Primero necesitas una propiedad.</Vacio>
          ) : (
            <FormaGasto propiedades={propiedades} />
          )}
        </Card>
      </div>
    </div>
  );
}
