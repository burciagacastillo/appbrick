import Link from "next/link";
import { Download, Eye, FileText, FolderOpen } from "lucide-react";
import { db } from "@/lib/db";
import { exigirSesion, propiedadesVisibles } from "@/lib/permisos";
import {
  Card,
  CardHeader,
  Badge,
  Vacio,
  Encabezado,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
} from "@/components/ui";
import { fechaCorta } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Pantalla del ayudante. Resuelve un caso muy concreto:
// "oye, necesito la INE de Edgar" → entra, la busca, la abre.
//
// Lo que NO hay aquí, y es a propósito: costos, márgenes, gastos, datos
// bancarios, contraseñas de Infonavit, ni propiedades que no se le asignaron.
// El ayudante ve documentos. Punto.

export default async function PantallaAyudante({
  searchParams,
}: PageProps<"/ayudante">) {
  const usuario = await exigirSesion();
  const sp = await searchParams;
  const busqueda = typeof sp.q === "string" ? sp.q.trim() : "";

  const visibles = await propiedadesVisibles(usuario);

  // Aunque sea admin, esta pantalla respeta el mismo alcance: así puedes
  // entrar y ver exactamente lo que ve tu ayudante.
  const filtro = visibles === "todas" ? {} : { propiedadId: { in: visibles } };

  if (visibles !== "todas" && visibles.length === 0) {
    return (
      <div className="space-y-8">
        <Encabezado titulo="Documentos" />
        <Card>
          <Vacio icono={<FolderOpen className="h-6 w-6" strokeWidth={1.5} />} titulo="Sin propiedades asignadas">
            Todavía no tienes propiedades asignadas. Pídele a Erick que te dé
            acceso a las que estés apoyando.
          </Vacio>
        </Card>
      </div>
    );
  }

  const documentos = await db.documento.findMany({
    where: {
      ...filtro,
      estado: { not: "rechazado" },
      ...(busqueda
        ? {
            OR: [
              // Postgres distingue mayúsculas; sin "insensitive", buscar "ine" no
              // encontraría la "INE". SQLite no las distinguía y no se notaba.
              { nombreArchivo: { contains: busqueda, mode: "insensitive" } },
              { tramite: { catalogo: { nombre: { contains: busqueda, mode: "insensitive" } } } },
              { propiedad: { nombre: { contains: busqueda, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      propiedad: { select: { id: true, nombre: true } },
      tramite: { include: { catalogo: true } },
    },
    orderBy: [{ propiedadId: "asc" }, { creadoEn: "desc" }],
  });

  // Agrupados por propiedad: así se busca en la vida real.
  const porPropiedad = new Map<string, { nombre: string; docs: typeof documentos }>();
  for (const d of documentos) {
    const entrada = porPropiedad.get(d.propiedadId) ?? {
      nombre: d.propiedad.nombre,
      docs: [] as typeof documentos,
    };
    entrada.docs.push(d);
    porPropiedad.set(d.propiedadId, entrada);
  }

  return (
    <div className="space-y-8">
      <Encabezado
        titulo={busqueda ? `“${busqueda}”` : "Documentos"}
        descripcion={
          <>
            {documentos.length}{" "}
            {documentos.length === 1 ? "documento" : "documentos"}
            {visibles === "todas"
              ? " · estás viendo todas las propiedades"
              : ` en ${visibles.length} ${visibles.length === 1 ? "propiedad" : "propiedades"}`}
          </>
        }
        acciones={
          busqueda ? (
            <Link href="/ayudante" className={BOTON_SECUNDARIO}>
              Quitar búsqueda
            </Link>
          ) : null
        }
      />

      {documentos.length === 0 ? (
        <Card>
          <Vacio>
            {busqueda
              ? `No hay nada que coincida con "${busqueda}".`
              : "Todavía no hay documentos cargados en tus propiedades."}
          </Vacio>
        </Card>
      ) : (
        [...porPropiedad.entries()].map(([id, grupo]) => (
          <Card key={id}>
            <CardHeader
              titulo={grupo.nombre}
              extra={
                <span className="text-xs text-slate-500">
                  {grupo.docs.length} documentos
                </span>
              }
            />
            <ul className="px-3 pb-3">
              {grupo.docs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-tinta">
                    <FileText className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {d.tramite ? (
                        <span className="text-xs font-semibold text-slate-400 tabular">
                          {d.tramite.catalogo.numero}
                        </span>
                      ) : null}
                      <span className="text-sm font-medium">
                        {d.tramite?.catalogo.nombre ?? d.nombreArchivo}
                      </span>
                      {d.estado === "pendiente" ? (
                        <Badge color="amber">Sin revisar</Badge>
                      ) : null}
                      {d.vigenciaHasta && d.vigenciaHasta < new Date() ? (
                        <Badge color="rose">Vencido</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Subido el {fechaCorta(d.creadoEn)} ·{" "}
                      {Math.round(d.tamanoBytes / 1024)} KB
                    </p>
                  </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`/api/documento/${d.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className={BOTON_SECUNDARIO}
                    >
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                      Abrir
                    </a>
                    <a href={`/api/documento/${d.id}?descargar=1`} className={BOTON_PRIMARIO}>
                      <Download className="h-4 w-4" strokeWidth={1.75} />
                      Descargar
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      <p className="text-xs text-slate-500">
        Cada vez que abres o descargas un documento queda registrado con tu
        nombre y la fecha. Son datos personales de terceros: trátalos como tales.
      </p>
    </div>
  );
}
