import Link from "next/link";
import { listarPropiedades } from "@/lib/queries";
import { Card, EtapaBadge, Barra, Vacio } from "@/components/ui";
import { mxn, ETAPAS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Propiedades() {
  const propiedades = await listarPropiedades();

  // Agrupadas por etapa, en el orden del ciclo del negocio.
  const grupos = ETAPAS.map((e) => ({
    etapa: e,
    items: propiedades.filter((p) => p.etapa === e.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Propiedades</h1>
          <p className="text-sm text-slate-500">{propiedades.length} en total</p>
        </div>
      </div>

      {grupos.length === 0 ? (
        <Card>
          <Vacio>
            No hay propiedades cargadas. Corre <code>npm run db:seed</code> para
            traerlas de tus carpetas.
          </Vacio>
        </Card>
      ) : (
        grupos.map((g) => (
          <section key={g.etapa.id} className="space-y-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold">{g.etapa.label}</h2>
              <span className="text-xs text-slate-500">{g.etapa.desc}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {g.items.map((p) => (
                <Link key={p.id} href={`/propiedades/${encodeURIComponent(p.id)}`}>
                  <Card className="h-full px-4 py-3 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.nombre}</div>
                        {p.direccion ? (
                          <div className="truncate text-xs text-slate-500">
                            {p.direccion}
                          </div>
                        ) : null}
                      </div>
                      <EtapaBadge id={p.etapa} />
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <Barra porcentaje={p.progreso.porcentaje} />
                      </div>
                      <span className="shrink-0 text-xs text-slate-500 tabular">
                        {p.progreso.completos}/{p.progreso.total}
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-slate-500">Compra</dt>
                        <dd className="tabular font-medium">{mxn(p.valorCompra)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Gastado</dt>
                        <dd className="tabular font-medium">{mxn(p.dinero.gastado)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Margen est.</dt>
                        <dd
                          className={`tabular font-medium ${
                            p.dinero.margen != null && p.dinero.margen < 0
                              ? "text-rose-600"
                              : ""
                          }`}
                        >
                          {mxn(p.dinero.margen)}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
