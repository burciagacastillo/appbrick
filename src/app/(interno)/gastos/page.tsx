import Link from "next/link";
import { db } from "@/lib/db";
import { cuentaEntreSocios, totalesDeGastos } from "@/lib/queries";
import { Card, CardHeader, Vacio } from "@/components/ui";
import { mxn, fechaCorta, labelCategoria, CATEGORIAS_GASTO } from "@/lib/constants";
import { exigirAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function Gastos() {
  await exigirAdmin();

  const MOSTRAR = 200;

  // Los totales se calculan en la base sobre TODOS los movimientos. La tabla
  // de abajo enseña solo los últimos; antes se sumaba esa tabla y se
  // presentaba como total, así que con más de 200 gastos reportaba de menos.
  const [totales, gastos, socios] = await Promise.all([
    totalesDeGastos(),
    db.gasto.findMany({
      include: { pagadoPor: true, propiedad: { select: { id: true, nombre: true } } },
      orderBy: { fecha: "desc" },
      take: MOSTRAR,
    }),
    cuentaEntreSocios(),
  ]);

  const ranking = totales.ranking;
  const mayor = ranking[0]?.monto ?? 1;
  const hayMas = totales.cuantos > gastos.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Gastos</h1>
        <p className="text-sm text-slate-500">
          {totales.cuantos} movimientos · {mxn(totales.total)} en total
        </p>
      </div>

      {totales.cuantos === 0 ? (
        <Card>
          <Vacio>
            Todavía no hay gastos. Se capturan dentro de cada propiedad, en la
            pestaña <strong>Gastos</strong>.
          </Vacio>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader titulo="En qué se va el dinero" />
              <ul className="divide-y divide-slate-100 dark:divide-brick-700">
                {ranking.map((c) => (
                  <li key={c.categoria} className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm">{labelCategoria(c.categoria)}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-brick-700">
                        <div
                          className="h-full bg-brick-600"
                          style={{ width: `${(c.monto / mayor) * 100}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-sm tabular">{mxn(c.monto)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader
                titulo="Cuenta entre socios"
                extra={<span className="text-xs text-slate-500">Quién ha puesto qué</span>}
              />
              {socios.length === 0 ? (
                <Vacio>
                  Ningún gasto trae registrado quién pagó. Llena ese campo al
                  capturar y aquí se arma la cuenta sola.
                </Vacio>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-brick-700">
                  {socios.map((s) => (
                    <li key={s.nombre} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.nombre}</span>
                        <span className="text-sm tabular font-semibold">
                          {mxn(s.total)}
                        </span>
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {s.porPropiedad.map((pp) => (
                          <li
                            key={pp.nombre}
                            className="flex justify-between text-xs text-slate-500"
                          >
                            <span>{pp.nombre}</span>
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

          <Card>
            <CardHeader
              titulo={hayMas ? `Últimos ${MOSTRAR} movimientos` : "Todos los movimientos"}
              extra={
                hayMas ? (
                  <span className="text-xs text-slate-500">
                    de {totales.cuantos} en total
                  </span>
                ) : null
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-brick-700">
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Propiedad</th>
                    <th className="px-4 py-2 font-medium">Descripción</th>
                    <th className="px-4 py-2 font-medium">Categoría</th>
                    <th className="px-4 py-2 font-medium">Pagó</th>
                    <th className="px-4 py-2 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-brick-700">
                  {gastos.map((g) => (
                    <tr key={g.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                        {fechaCorta(g.fecha)}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/propiedades/${encodeURIComponent(g.propiedad.id)}?tab=gastos`}
                          className="text-brick-700 hover:underline dark:text-gold-400"
                        >
                          {g.propiedad.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{g.descripcion}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {labelCategoria(g.categoria)}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {g.pagadoPor?.nombre ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right tabular">
                        {mxn(g.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p className="text-xs text-slate-500">
        Categorías disponibles: {CATEGORIAS_GASTO.length}. Se editan en{" "}
        <code>src/lib/constants.ts</code>.
      </p>
    </div>
  );
}
