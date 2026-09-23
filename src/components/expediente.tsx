import Link from "next/link";
import { cambiarEstadoTramite, alternarSubdoc, guardarDetalleTramite } from "@/acciones/propiedades";
import { Badge, CLASE_CAMPO } from "./ui";
import { ESTADOS_TRAMITE, BLOQUES, mxn, fechaCorta } from "@/lib/constants";
import type { PropiedadDetalle } from "@/lib/queries";

type Tramite = PropiedadDetalle["tramites"][number];

/** Los tres checks del ciclo a/b/c de un trámite municipal. */
function CicloPago({ t }: { t: Tramite }) {
  const pasos = [
    { campo: "docRecibido", label: "Documento", sufijo: "a", activo: t.docRecibido },
    { campo: "ordenDeCobro", label: "Orden de cobro", sufijo: "b", activo: t.ordenDeCobro },
    { campo: "pagoComprobado", label: "Pagado", sufijo: "c", activo: t.pagoComprobado },
  ];

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {pasos.map((p) => (
        <form key={p.campo} action={alternarSubdoc}>
          <input type="hidden" name="tramiteId" value={t.id} />
          <input type="hidden" name="campo" value={p.campo} />
          <button
            type="submit"
            className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
              p.activo
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-linea bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            <span className="font-semibold">{p.sufijo}</span> {p.label}{" "}
            {p.activo ? "✓" : ""}
          </button>
        </form>
      ))}
    </div>
  );
}

function FilaTramite({ t, propiedadId }: { t: Tramite; propiedadId: string }) {
  const alerta = t.ordenDeCobro && !t.pagoComprobado;
  const vencido = t.fechaLimite != null && t.fechaLimite < new Date() && t.estado !== "completo";

  return (
    <li
      className={`px-6 py-4 ${
        t.estado === "no_aplica" ? "opacity-50" : ""
      } ${vencido ? "bg-rose-50/60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-semibold text-slate-400 tabular">
          {t.catalogo.numero}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{t.catalogo.nombre}</span>
            {t.catalogo.opcional ? <Badge>Si aplica</Badge> : null}
            {vencido ? <Badge color="rose">Vencido</Badge> : null}
            {alerta ? <Badge color="amber">Falta comprobante</Badge> : null}
          </div>

          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
            {t.catalogo.dondeSeTramita ? <span>{t.catalogo.dondeSeTramita}</span> : null}
            {t.responsable ? <span>· {t.responsable}</span> : null}
            {t.fechaLimite ? <span>· límite {fechaCorta(t.fechaLimite)}</span> : null}
            {t.costo ? <span>· {mxn(t.costo)}</span> : null}
          </div>

          {/* Archivos subidos por el comprador o por ti, abribles desde aquí.
              Antes había que ir a la bandeja de revisión, y una vez aprobado
              el documento ya no estaba ahí. */}
          {t.documentos.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {t.documentos.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <a
                    href={`/api/documento/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-mono text-brick-700 hover:underline"
                    title={d.nombreArchivo}
                  >
                    {d.nombreArchivo}
                  </a>
                  {d.estado === "pendiente" ? <Badge color="amber">Sin revisar</Badge> : null}
                  {d.estado === "rechazado" ? <Badge color="rose">Rechazado</Badge> : null}
                  {d.vigenciaHasta && d.vigenciaHasta < new Date() ? (
                    <Badge color="rose">Vencido</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : t.archivo ? (
            <p className="mt-1 truncate font-mono text-xs text-slate-400" title={t.archivo}>
              {t.archivo}
              <span className="ml-2 not-italic text-slate-400">(en tu carpeta)</span>
            </p>
          ) : null}

          {alerta ? (
            <p className="mt-1 text-xs italic text-amber-700">
              Ya hay orden de cobro pero no se ve el comprobante de pago.
            </p>
          ) : null}

          {t.notas ? (
            <p className="mt-1 text-xs italic text-slate-500">{t.notas}</p>
          ) : null}

          {/* Los trámites 13, 18 y 19 no son archivos: son datos que se
              capturan en la pestaña Personas. Pedirles un PDF era pedir algo
              que no existe. */}
          {t.catalogo.esDato ? (
            <p className="mt-1.5 text-xs">
              <span className="text-slate-500">Este no se sube, se captura. </span>
              <Link
                href={`/propiedades/${encodeURIComponent(propiedadId)}?tab=personas`}
                className="font-medium text-brick-700 hover:underline"
              >
                Ir a Personas →
              </Link>
            </p>
          ) : null}

          {t.catalogo.requierePago ? <CicloPago t={t} /> : null}

          <details className="mt-2 group">
            <summary className="cursor-pointer list-none text-xs text-brick-700 hover:underline">
              Detalles
            </summary>
            <form
              action={guardarDetalleTramite}
              className="mt-2 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"
            >
              <input type="hidden" name="tramiteId" value={t.id} />
              <label className="text-xs">
                <span className="text-slate-500">Quién trae la bola</span>
                <input
                  name="responsable"
                  defaultValue={t.responsable ?? ""}
                  placeholder="Erick, Poncho, Notaría 29…"
                  className={CLASE_CAMPO}
                />
              </label>
              <label className="text-xs">
                <span className="text-slate-500">Fecha límite</span>
                <input
                  type="date"
                  name="fechaLimite"
                  defaultValue={
                    t.fechaLimite ? t.fechaLimite.toISOString().slice(0, 10) : ""
                  }
                  className={CLASE_CAMPO}
                />
              </label>
              <label className="text-xs">
                <span className="text-slate-500">Costo del trámite</span>
                <input
                  type="number"
                  step="0.01"
                  name="costo"
                  defaultValue={t.costo ?? ""}
                  className="mt-0.5 w-full rounded-xl border border-linea px-2 py-1.5 text-sm tabular"
                />
              </label>
              <label className="text-xs sm:col-span-2">
                <span className="text-slate-500">Notas</span>
                <input
                  name="notas"
                  defaultValue={t.notas ?? ""}
                  className={CLASE_CAMPO}
                />
              </label>
              {t.catalogo.notasAyuda ? (
                <p className="text-xs italic text-slate-500 sm:col-span-2">
                  {t.catalogo.notasAyuda}
                </p>
              ) : null}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-tinta px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Guardar
                </button>
              </div>
            </form>
          </details>
        </div>

        {/* Botonera de estado: un toque desde el celular */}
        <div className="flex shrink-0 gap-1">
          {ESTADOS_TRAMITE.map((e) => (
            <form key={e.id} action={cambiarEstadoTramite}>
              <input type="hidden" name="tramiteId" value={t.id} />
              <input type="hidden" name="estado" value={e.id} />
              <button
                type="submit"
                title={e.label}
                aria-label={`Marcar como ${e.label}`}
                className={`grid h-7 w-7 place-items-center rounded-lg border text-sm transition-colors ${
                  t.estado === e.id
                    ? "border-brick-800 bg-brick-800 text-white"
                    : "border-linea text-slate-400 hover:border-slate-400"
                }`}
              >
                {e.icono}
              </button>
            </form>
          ))}
        </div>
      </div>
    </li>
  );
}

export function Expediente({
  tramites,
  propiedadId,
}: {
  tramites: Tramite[];
  propiedadId: string;
}) {
  return (
    <div className="space-y-4">
      {BLOQUES.map((b) => {
        const items = tramites.filter((t) => t.catalogo.bloque === b.id);
        if (items.length === 0) return null;

        const completos = items.filter((t) => t.estado === "completo").length;
        const aplicables = items.filter((t) => t.estado !== "no_aplica").length;

        return (
          <div
            key={b.id}
            className="overflow-hidden rounded-tarjeta bg-white shadow-suave ring-1 ring-black/[0.03]"
          >
            <div className="flex items-center justify-between border-b border-linea/60 px-6 pt-5 pb-3">
              <h3 className="text-sm font-semibold">
                <span className="mr-2 text-gold-600">{b.id}</span>
                {b.nombre}
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ({b.rango})
                </span>
              </h3>
              <span className="text-xs text-slate-500 tabular">
                {completos}/{aplicables}
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((t) => (
                <FilaTramite key={t.id} t={t} propiedadId={propiedadId} />
              ))}
            </ul>
          </div>
        );
      })}
      <p className="text-xs text-slate-500">
        Leyenda: {ESTADOS_TRAMITE.map((e) => `${e.icono} ${e.label}`).join(" · ")}
      </p>
    </div>
  );
}
