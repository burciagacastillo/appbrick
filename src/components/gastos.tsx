import { eliminarGasto } from "@/acciones/propiedades";
import { FormaGasto } from "./formularios";
import { Card, CardHeader, Vacio } from "./ui";
import { mxn, fechaCorta, labelCategoria } from "@/lib/constants";
import type { PropiedadDetalle } from "@/lib/queries";


export function TablaGastos({ propiedad }: { propiedad: PropiedadDetalle }) {
  const { gastos, dinero } = propiedad;

  // Totales por categoría, para ver dónde se está yendo el dinero.
  const porCategoria = new Map<string, number>();
  for (const g of gastos) {
    porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + g.monto);
  }
  const ranking = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);

  // Cuánto puso cada quien: la cuenta entre socios de esta propiedad.
  const porPersona = new Map<string, number>();
  for (const g of gastos) {
    const nombre = g.pagadoPor?.nombre ?? "Sin registrar";
    porPersona.set(nombre, (porPersona.get(nombre) ?? 0) + g.monto);
  }

  const presupuesto = propiedad.presupuestoObra ?? dinero.presupuestado;
  const sobre = presupuesto > 0 && dinero.gastado > presupuesto;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="px-6 py-5">
          <div className="text-[13px] font-medium text-tenue">Gastado</div>
          <div className="mt-3 text-[26px] leading-none font-bold tracking-tight tabular">{mxn(dinero.gastado)}</div>
        </Card>
        <Card className="px-6 py-5">
          <div className="text-[13px] font-medium text-tenue">
            Presupuesto de obra
          </div>
          <div className="mt-3 text-[26px] leading-none font-bold tracking-tight tabular">
            {presupuesto > 0 ? mxn(presupuesto) : "—"}
          </div>
        </Card>
        <Card className="px-6 py-5">
          <div className="text-[13px] font-medium text-tenue">Desviación</div>
          <div
            className={`mt-3 text-[26px] leading-none font-bold tracking-tight tabular ${
              sobre ? "text-rose-600" : presupuesto > 0 ? "text-emerald-600" : ""
            }`}
          >
            {presupuesto > 0 ? mxn(dinero.gastado - presupuesto) : "—"}
          </div>
          {presupuesto > 0 ? (
            <div className="mt-0.5 text-xs text-slate-500">
              {sobre ? "Vas arriba del presupuesto" : "Todavía cabe"}
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-slate-500">
              Captura el presupuesto en Datos
            </div>
          )}
        </Card>
      </div>

      {ranking.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader titulo="En qué se ha ido" />
            <ul className="divide-y divide-slate-100">
              {ranking.map(([cat, monto]) => (
                <li key={cat} className="flex items-center justify-between px-6 py-2.5">
                  <span className="text-sm">{labelCategoria(cat)}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brick-800"
                        style={{ width: `${(monto / ranking[0][1]) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 text-right text-sm tabular">{mxn(monto)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader titulo="Quién ha puesto" />
            <ul className="divide-y divide-slate-100">
              {[...porPersona.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([nombre, monto]) => (
                  <li
                    key={nombre}
                    className="flex items-center justify-between px-6 py-2.5"
                  >
                    <span
                      className={`text-sm ${
                        nombre === "Sin registrar" ? "italic text-slate-400" : ""
                      }`}
                    >
                      {nombre}
                    </span>
                    <span className="text-sm tabular">{mxn(monto)}</span>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader titulo="Registrar gasto" />
        <FormaGasto propiedadId={propiedad.id} />
      </Card>

      <Card>
        <CardHeader
          titulo="Movimientos"
          extra={<span className="text-xs text-slate-500">{gastos.length}</span>}
        />
        {gastos.length === 0 ? (
          <Vacio>Todavía no hay gastos capturados en esta propiedad.</Vacio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linea text-left text-[13px] font-medium text-tenue">
                  <th className="px-6 py-2.5 font-medium">Fecha</th>
                  <th className="px-6 py-2.5 font-medium">Descripción</th>
                  <th className="px-6 py-2.5 font-medium">Categoría</th>
                  <th className="px-6 py-2.5 font-medium">Pagó</th>
                  <th className="px-6 py-2.5 text-right font-medium">Monto</th>
                  <th className="px-6 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gastos.map((g) => (
                  <tr key={g.id}>
                    <td className="whitespace-nowrap px-6 py-2.5 text-xs text-slate-500">
                      {fechaCorta(g.fecha)}
                    </td>
                    <td className="px-6 py-2.5">{g.descripcion}</td>
                    <td className="px-6 py-2.5 text-xs text-slate-500">
                      {labelCategoria(g.categoria)}
                    </td>
                    <td className="px-6 py-2.5 text-xs text-slate-500">
                      {g.pagadoPor?.nombre ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-2.5 text-right tabular">
                      {mxn(g.monto)}
                    </td>
                    <td className="px-6 py-2.5 text-right">
                      <form action={eliminarGasto}>
                        <input type="hidden" name="gastoId" value={g.id} />
                        <button
                          type="submit"
                          className="text-xs text-slate-400 hover:text-rose-600"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-linea font-semibold">
                  <td colSpan={4} className="px-6 py-2.5 text-right text-xs uppercase text-slate-500">
                    Total
                  </td>
                  <td className="px-6 py-2.5 text-right tabular">{mxn(dinero.gastado)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
