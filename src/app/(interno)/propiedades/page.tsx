import { Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { listarPropiedades } from "@/lib/queries";
import { Card, Vacio, Encabezado } from "@/components/ui";
import { TarjetaPropiedad } from "@/components/tarjeta-propiedad";
import { ETAPAS } from "@/lib/constants";
import { exigirAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function Propiedades() {
  await exigirAdmin();

  const [propiedades, fotos] = await Promise.all([
    listarPropiedades(),
    // Portada primero; si ninguna está marcada, la primera en orden.
    db.foto.findMany({
      orderBy: [{ esPortada: "desc" }, { orden: "asc" }],
      select: { id: true, propiedadId: true },
    }),
  ]);

  const portada = new Map<string, string>();
  for (const f of fotos) {
    if (!portada.has(f.propiedadId)) portada.set(f.propiedadId, f.id);
  }

  // Agrupadas por etapa, en el orden del ciclo del negocio.
  const grupos = ETAPAS.map((e) => ({
    etapa: e,
    items: propiedades.filter((p) => p.etapa === e.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-12">
      <Encabezado titulo="Propiedades" descripcion={`${propiedades.length} en total`} />

      {grupos.length === 0 ? (
        <Card>
          <Vacio icono={<Building2 className="h-6 w-6" strokeWidth={1.5} />} titulo="Sin propiedades">
            Corre <code>npm run db:seed</code> para traerlas de tus carpetas.
          </Vacio>
        </Card>
      ) : (
        grupos.map((g) => (
          <section key={g.etapa.id} className="space-y-5">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold tracking-tight">{g.etapa.label}</h2>
              <span className="text-sm text-tenue">{g.etapa.desc}</span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((p) => (
                <TarjetaPropiedad key={p.id} p={p} fotoId={portada.get(p.id)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
