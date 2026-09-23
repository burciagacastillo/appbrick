import Link from "next/link";
import { ArrowUpRight, FileText, Monitor, Upload } from "lucide-react";
import { cambiarEstadoTramite, alternarSubdoc, guardarDetalleTramite } from "@/acciones/propiedades";
import { prepararSubidaAdmin, subirDocumentoAdmin } from "@/acciones/documentos";
import { Badge, CLASE_CAMPO } from "./ui";
import { ZonaSubida } from "./zona-subida";

const ETIQUETA_SUBTIPO: Record<string, string> = {
  a: "Documento",
  b: "Orden de cobro",
  c: "Comprobante de pago",
};
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

          {/* En celular, la botonera baja para no apretar el nombre. */}
          <div className="mt-2 sm:hidden">
            <BotonesEstado t={t} />
          </div>

          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
            {t.catalogo.dondeSeTramita ? <span>{t.catalogo.dondeSeTramita}</span> : null}
            {t.responsable ? <span>· {t.responsable}</span> : null}
            {t.fechaLimite ? <span>· límite {fechaCorta(t.fechaLimite)}</span> : null}
            {t.costo ? <span>· {mxn(t.costo)}</span> : null}
          </div>

          {/* Los archivos, abribles con un toque — también desde el celular.
              El link pasa por /api/documento, que revisa permiso y deja
              registro; nunca es la dirección directa del archivo. */}
          {t.documentos.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.documentos.map((d) => (
                <li key={d.id}>
                  <a
                    href={`/api/documento/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title={d.nombreArchivo}
                    className={`inline-flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
                      d.estado === "rechazado"
                        ? "bg-white text-slate-400 line-through ring-linea"
                        : "bg-white text-tinta ring-linea hover:bg-slate-50 hover:ring-slate-300"
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-tenue" strokeWidth={1.75} />
                    <span className="truncate">
                      {d.subTipo ? `${d.subTipo} · ${ETIQUETA_SUBTIPO[d.subTipo] ?? "Archivo"}` : "Abrir"}
                    </span>
                    <span className="shrink-0 text-xs font-normal text-slate-400">
                      {fechaCorta(d.creadoEn)}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
                  </a>
                  {d.estado === "pendiente" ? (
                    <span className="ml-1.5 align-middle">
                      <Badge color="amber">Sin revisar</Badge>
                    </span>
                  ) : null}
                  {d.estado !== "rechazado" && d.vigenciaHasta && d.vigenciaHasta < new Date() ? (
                    <span className="ml-1.5 align-middle">
                      <Badge color="rose">Vencido</Badge>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : t.archivo ? (
            // El escáner lo vio en tu carpeta de Windows, pero no está en la
            // app: desde el celular no hay nada que abrir hasta subirlo.
            <p className="mt-2 flex items-start gap-1.5 text-xs text-tenue">
              <Monitor className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>
                Está en tu computadora
                <span className="font-mono text-slate-400"> ({t.archivo})</span>. Súbelo
                para verlo desde el celular.
              </span>
            </p>
          ) : null}

          {!t.catalogo.esDato && t.estado !== "no_aplica" ? (
            <details className="group/subir mt-3">
              <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-tenue ring-1 ring-inset ring-linea transition-colors hover:bg-slate-50 hover:text-tinta group-open/subir:bg-slate-100 group-open/subir:text-tinta">
                <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                {t.documentos.some((d) => d.estado !== "rechazado") ? "Subir otro archivo" : "Subir archivo"}
              </summary>
              <div className="mt-3 max-w-md">
                <ZonaSubida
                  campos={{ tramiteId: t.id }}
                  preparar={prepararSubidaAdmin}
                  confirmar={subirDocumentoAdmin}
                  conSubTipo={t.catalogo.requierePago}
                  titulo="Elige el archivo o tómale foto"
                  maximoMb={50}
                  compacta
                />
              </div>
            </details>
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

        {/* En pantalla ancha, la botonera va a la derecha. */}
        <div className="hidden shrink-0 sm:block">
          <BotonesEstado t={t} />
        </div>
      </div>
    </li>
  );
}

/** Botonera de estado: un toque, también desde el celular. */
function BotonesEstado({ t }: { t: Tramite }) {
  return (
    <div className="inline-flex gap-0.5 rounded-xl bg-slate-100 p-0.5">
      {ESTADOS_TRAMITE.map((e) => (
        <form key={e.id} action={cambiarEstadoTramite}>
          <input type="hidden" name="tramiteId" value={t.id} />
          <input type="hidden" name="estado" value={e.id} />
          <button
            type="submit"
            title={e.label}
            aria-label={`Marcar como ${e.label}`}
            aria-pressed={t.estado === e.id}
            className={`grid h-8 w-8 place-items-center rounded-lg text-sm transition-colors ${
              t.estado === e.id
                ? "bg-tinta text-white shadow-suave"
                : "text-slate-400 hover:bg-white hover:text-tinta"
            }`}
          >
            {e.icono}
          </button>
        </form>
      ))}
    </div>
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
