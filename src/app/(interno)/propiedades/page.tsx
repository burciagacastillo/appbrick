import Link from "next/link";
import { Building2, HousePlus } from "lucide-react";
import { db } from "@/lib/db";
import { listarPropiedades } from "@/lib/queries";
import { Card, Vacio, Encabezado, BOTON_PRIMARIO } from "@/components/ui";
import { TarjetaPropiedad } from "@/components/tarjeta-propiedad";
import { TableroFases, type TarjetaFase } from "@/components/tablero-fases";
import { etiquetaPaso, hoy } from "@/lib/agenda";
import { ETAPAS } from "@/lib/constants";
import { exigirAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const VISTAS = [
  { id: "galeria", label: "Galería" },
  { id: "fases", label: "Por fase" },
] as const;

export default async function Propiedades({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirAdmin();
  const vista = (await searchParams).vista === "fases" ? "fases" : "galeria";

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

  // Por fase: solo lo que pinta cada tarjeta (es un componente de cliente).
  const hoyDia = hoy();
  const tarjetas: TarjetaFase[] = propiedades.map((p) => {
    const cuando = p.pasos.siguiente ? etiquetaPaso(p.pasos.siguiente.dia, hoyDia) : null;
    return {
      id: p.id,
      nombre: p.nombre,
      etapa: p.etapa,
      externa: p.modalidad === "externa",
      porcentaje: p.progreso.porcentaje,
      revisar: p.progreso.revisar,
      actualizado: p.actualizadoEn.getTime(),
      siguiente: p.pasos.siguiente
        ? { titulo: p.pasos.siguiente.titulo, cuando: cuando?.texto ?? null, atrasado: cuando?.atrasado ?? false }
        : null,
    };
  });

  // Galería: agrupadas por etapa, en el orden del ciclo del negocio.
  const grupos = ETAPAS.map((e) => ({
    etapa: e,
    items: propiedades.filter((p) => p.etapa === e.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Propiedades"
        descripcion={`${propiedades.length} en total`}
        acciones={
          <Link href="/propiedades/nueva" className={BOTON_PRIMARIO}>
            <HousePlus className="h-4 w-4" strokeWidth={1.75} />
            Nueva propiedad
          </Link>
        }
      />

      <div className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-suave ring-1 ring-black/[0.03]">
        {VISTAS.map((v) => (
          <Link
            key={v.id}
            href={v.id === "galeria" ? "/propiedades" : "/propiedades?vista=fases"}
            aria-current={vista === v.id ? "page" : undefined}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              vista === v.id ? "bg-tinta text-white" : "text-tenue hover:bg-slate-50 hover:text-tinta"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {grupos.length === 0 ? (
        <Card>
          <Vacio icono={<Building2 className="h-6 w-6" strokeWidth={1.5} />} titulo="Sin propiedades">
            Da de alta la primera con el botón “Nueva propiedad”.
          </Vacio>
        </Card>
      ) : vista === "fases" ? (
        <TableroFases tarjetas={tarjetas} />
      ) : (
        grupos.map((g) => (
          <section key={g.etapa.id} className="space-y-5 pt-4">
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
