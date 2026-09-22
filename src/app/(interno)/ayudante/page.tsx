import { db } from "@/lib/db";
import { exigirSesion, propiedadesVisibles } from "@/lib/permisos";
import { Card, CardHeader, Badge, Vacio } from "@/components/ui";
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
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Documentos</h1>
        <Card>
          <Vacio>
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
              { nombreArchivo: { contains: busqueda } },
              { tramite: { catalogo: { nombre: { contains: busqueda } } } },
              { propiedad: { nombre: { contains: busqueda } } },
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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Documentos</h1>
        <p className="text-sm text-slate-500">
          {documentos.length}{" "}
          {documentos.length === 1 ? "documento disponible" : "documentos disponibles"}
          {visibles === "todas"
            ? " · estás viendo todas las propiedades"
            : ` en ${visibles.length} ${visibles.length === 1 ? "propiedad" : "propiedades"}`}
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar: INE, CURP, Edgar, Turmalina…"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-brick-700 dark:bg-brick-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-brick-800 px-4 py-2 text-sm font-medium text-white hover:bg-brick-700"
        >
          Buscar
        </button>
      </form>

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
            <ul className="divide-y divide-slate-100 dark:divide-brick-700">
              {grupo.docs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
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

                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`/api/documento/${d.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-brick-700 dark:hover:bg-brick-800"
                    >
                      Abrir
                    </a>
                    <a
                      href={`/api/documento/${d.id}?descargar=1`}
                      className="rounded-md bg-brick-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-brick-700"
                    >
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
