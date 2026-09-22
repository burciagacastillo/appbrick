import Link from "next/link";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { Card, CardHeader, Badge, Vacio } from "@/components/ui";
import { fechaCorta } from "@/lib/constants";
import { aprobarDocumento, corregirFecha } from "@/acciones/documentos";
import { FormaRechazo } from "@/components/formularios";

export const dynamic = "force-dynamic";

// Bandeja de revisión. Lo que sube el comprador entra como "pendiente" y
// vive aquí hasta que lo apruebas o lo rechazas con motivo.

/** Motivos de un clic. Cubren casi todo lo que pasa en la realidad. */
const MOTIVOS_RAPIDOS = [
  "Se ve borroso, no se alcanza a leer.",
  "Falta el otro lado del documento.",
  "Está incompleto, faltan hojas.",
  "Ese documento no es el que se pide.",
  "Ya está vencido, necesito uno más reciente.",
];

async function pendientes() {
  return db.documento.findMany({
    where: { estado: "pendiente" },
    include: {
      propiedad: { select: { id: true, nombre: true } },
      tramite: { include: { catalogo: true } },
      subidoPorInvitacion: { include: { persona: true } },
      subidoPorUsuario: true,
    },
    orderBy: { creadoEn: "asc" },
  });
}

async function caducando() {
  const enUnMes = new Date();
  enUnMes.setDate(enUnMes.getDate() + 30);

  return db.documento.findMany({
    where: {
      estado: "aprobado",
      vigenciaHasta: { not: null, lte: enUnMes },
    },
    include: {
      propiedad: { select: { id: true, nombre: true } },
      tramite: { include: { catalogo: true } },
    },
    orderBy: { vigenciaHasta: "asc" },
  });
}

type DocPendiente = Awaited<ReturnType<typeof pendientes>>[number];

function Documento({ d }: { d: DocPendiente }) {
  const quien =
    d.subidoPorInvitacion?.persona.nombre ??
    d.subidoPorUsuario?.nombre ??
    "desconocido";

  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {d.tramite ? (
              <span className="text-xs font-semibold text-slate-400 tabular">
                {d.tramite.catalogo.numero}
              </span>
            ) : null}
            <span className="font-medium">
              {d.tramite?.catalogo.nombre ?? d.nombreArchivo}
            </span>
            <Badge color="amber">Pendiente</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            <Link
              href={`/propiedades/${encodeURIComponent(d.propiedadId)}`}
              className="font-medium text-brick-700 hover:underline dark:text-gold-400"
            >
              {d.propiedad.nombre}
            </Link>
            {" · "}Lo subió {quien} el {fechaCorta(d.creadoEn)}
            {" · "}
            {Math.round(d.tamanoBytes / 1024)} KB
          </p>
          <p className="mt-1 truncate font-mono text-xs text-slate-400">
            {d.nombreArchivo}
          </p>
        </div>

        <a
          href={`/api/documento/${d.id}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-brick-700 dark:hover:bg-brick-800"
        >
          Ver documento ↗
        </a>
      </div>

      {/* Fecha real del documento: de aquí sale la vigencia de los recibos */}
      {d.tramite?.catalogo.vigenciaDias ? (
        <form action={corregirFecha} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="documentoId" value={d.id} />
          <label className="text-xs">
            <span className="text-slate-500">Fecha del documento</span>
            <input
              type="date"
              name="fechaDocumento"
              defaultValue={
                d.fechaDocumento ? d.fechaDocumento.toISOString().slice(0, 10) : ""
              }
              className="mt-0.5 block rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-brick-700 dark:bg-brick-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:border-brick-700 dark:hover:bg-brick-800"
          >
            Guardar fecha
          </button>
          <span className="pb-1.5 text-xs text-slate-500">
            vence a los {d.tramite.catalogo.vigenciaDias} días
          </span>
        </form>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={aprobarDocumento}>
          <input type="hidden" name="documentoId" value={d.id} />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            ✓ Aprobar
          </button>
        </form>

        <FormaRechazo
          documentoId={d.id}
          quien={quien.split(" ")[0]}
          motivosRapidos={[...MOTIVOS_RAPIDOS]}
        />
      </div>
    </li>
  );
}

export default async function Revisar() {
  await exigirAdmin();
  const [docs, porCaducar] = await Promise.all([pendientes(), caducando()]);

  const hoy = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Revisar</h1>
        <p className="text-sm text-slate-500">
          {docs.length === 0
            ? "Nada esperando revisión."
            : `${docs.length} ${
                docs.length === 1 ? "documento espera" : "documentos esperan"
              } tu visto bueno`}
        </p>
      </div>

      <Card>
        <CardHeader titulo="Esperando revisión" />
        {docs.length === 0 ? (
          <Vacio>
            Todo al corriente. Cuando un comprador suba algo, aparece aquí.
          </Vacio>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-brick-700">
            {docs.map((d) => (
              <Documento key={d.id} d={d} />
            ))}
          </ul>
        )}
      </Card>

      {porCaducar.length > 0 ? (
        <Card>
          <CardHeader
            titulo="Vencidos o por vencer"
            extra={<span className="text-xs text-slate-500">Infonavit los rebota</span>}
          />
          <ul className="divide-y divide-slate-100 dark:divide-brick-700">
            {porCaducar.map((d) => {
              const vence = d.vigenciaHasta as Date;
              const vencido = vence < hoy;
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {d.tramite?.catalogo.nombre ?? d.nombreArchivo}
                    </span>
                    <p className="text-xs text-slate-500">
                      <Link
                        href={`/propiedades/${encodeURIComponent(d.propiedadId)}`}
                        className="text-brick-700 hover:underline dark:text-gold-400"
                      >
                        {d.propiedad.nombre}
                      </Link>
                    </p>
                  </div>
                  <Badge color={vencido ? "rose" : "amber"}>
                    {vencido ? "Venció el " : "Vence el "}
                    {fechaCorta(vence)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
