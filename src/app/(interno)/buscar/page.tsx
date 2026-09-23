import Link from "next/link";
import { Building2, FileText, Receipt, Search, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { Card, CardHeader, EstadoBadge, EtapaBadge, Encabezado, Vacio } from "@/components/ui";
import { fechaCorta, labelCategoria, mxn, rolPersona } from "@/lib/constants";

export const dynamic = "force-dynamic";

// El buscador de la barra superior. Solo admin: busca en todo, incluidas
// personas. El ayudante tiene su propio buscador, limitado a sus documentos.

const POR_GRUPO = 8;

export default async function Buscar({ searchParams }: PageProps<"/buscar">) {
  await exigirAdmin();

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";

  if (q.length < 2) {
    return (
      <div className="space-y-8">
        <Encabezado titulo="Buscar" />
        <Card>
          <Vacio icono={<Search className="h-6 w-6" strokeWidth={1.5} />} titulo="¿Qué buscas?">
            Escribe al menos dos letras arriba: el nombre de una casa, de un
            comprador, de un trámite o de un gasto.
          </Vacio>
        </Card>
      </div>
    );
  }

  // Postgres distingue mayúsculas; sin "insensitive", "sierra" no encuentra "Sierra".
  const tiene = { contains: q, mode: "insensitive" as const };

  const [propiedades, personas, tramites, gastos] = await Promise.all([
    db.propiedad.findMany({
      where: { OR: [{ nombre: tiene }, { direccion: tiene }] },
      orderBy: { nombre: "asc" },
      take: POR_GRUPO,
    }),
    db.persona.findMany({
      where: { OR: [{ nombre: tiene }, { telefono: tiene }] },
      include: { participaciones: { include: { propiedad: { select: { id: true, nombre: true } } } } },
      orderBy: { nombre: "asc" },
      take: POR_GRUPO,
    }),
    db.tramite.findMany({
      where: {
        catalogo: { nombre: tiene },
        estado: { in: ["falta", "revisar"] },
        propiedad: { etapa: { notIn: ["concluida", "cancelada"] } },
      },
      include: { catalogo: true, propiedad: { select: { id: true, nombre: true } } },
      orderBy: [{ propiedad: { nombre: "asc" } }, { catalogo: { numero: "asc" } }],
      take: POR_GRUPO,
    }),
    db.gasto.findMany({
      where: { descripcion: tiene },
      include: { propiedad: { select: { id: true, nombre: true } } },
      orderBy: { fecha: "desc" },
      take: POR_GRUPO,
    }),
  ]);

  const total = propiedades.length + personas.length + tramites.length + gastos.length;

  return (
    <div className="space-y-8">
      <Encabezado
        titulo={`“${q}”`}
        descripcion={total === 0 ? "Sin resultados" : `${total} resultados`}
      />

      {total === 0 ? (
        <Card>
          <Vacio icono={<Search className="h-6 w-6" strokeWidth={1.5} />} titulo="No encontré nada">
            Prueba con otra palabra, o con solo una parte del nombre.
          </Vacio>
        </Card>
      ) : null}

      {propiedades.length > 0 ? (
        <Grupo titulo="Propiedades">
          {propiedades.map((p) => (
            <Renglon
              key={p.id}
              href={`/propiedades/${encodeURIComponent(p.id)}`}
              icono={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
              titulo={p.nombre}
              detalle={p.direccion}
              extra={<EtapaBadge id={p.etapa} />}
            />
          ))}
        </Grupo>
      ) : null}

      {personas.length > 0 ? (
        <Grupo titulo="Personas">
          {personas.map((persona) => {
            const primera = persona.participaciones[0];
            return (
              <Renglon
                key={persona.id}
                href={
                  primera
                    ? `/propiedades/${encodeURIComponent(primera.propiedad.id)}?tab=personas`
                    : undefined
                }
                icono={<UserRound className="h-4 w-4" strokeWidth={1.75} />}
                titulo={persona.nombre}
                detalle={
                  persona.participaciones
                    .map((pp) => `${rolPersona(pp.rol)} · ${pp.propiedad.nombre}`)
                    .join("  ·  ") || "Sin propiedad vinculada"
                }
              />
            );
          })}
        </Grupo>
      ) : null}

      {tramites.length > 0 ? (
        <Grupo titulo="Trámites pendientes">
          {tramites.map((t) => (
            <Renglon
              key={t.id}
              href={`/propiedades/${encodeURIComponent(t.propiedad.id)}?tab=expediente`}
              icono={<FileText className="h-4 w-4" strokeWidth={1.75} />}
              titulo={`${t.catalogo.numero} · ${t.catalogo.nombre}`}
              detalle={t.propiedad.nombre}
              extra={<EstadoBadge id={t.estado} />}
            />
          ))}
        </Grupo>
      ) : null}

      {gastos.length > 0 ? (
        <Grupo titulo="Gastos">
          {gastos.map((g) => (
            <Renglon
              key={g.id}
              href={`/propiedades/${encodeURIComponent(g.propiedad.id)}?tab=gastos`}
              icono={<Receipt className="h-4 w-4" strokeWidth={1.75} />}
              titulo={g.descripcion}
              detalle={`${g.propiedad.nombre} · ${labelCategoria(g.categoria)} · ${fechaCorta(g.fecha)}`}
              extra={<span className="text-sm font-semibold tabular">{mxn(g.monto)}</span>}
            />
          ))}
        </Grupo>
      ) : null}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader titulo={titulo} />
      <ul className="px-3 pb-3">{children}</ul>
    </Card>
  );
}

function Renglon({
  href,
  icono,
  titulo,
  detalle,
  extra,
}: {
  href?: string;
  icono: ReactNode;
  titulo: string;
  detalle?: string | null;
  extra?: ReactNode;
}) {
  const contenido = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-tenue">
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-tinta">{titulo}</span>
        {detalle ? <span className="block truncate text-xs text-tenue">{detalle}</span> : null}
      </span>
      {extra}
    </>
  );
  const clase = "flex items-center gap-3 rounded-xl px-3 py-2.5";
  return (
    <li>
      {href ? (
        <Link href={href} className={`${clase} transition-colors hover:bg-slate-50`}>
          {contenido}
        </Link>
      ) : (
        <div className={clase}>{contenido}</div>
      )}
    </li>
  );
}
