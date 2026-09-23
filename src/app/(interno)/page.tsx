import Link from "next/link";
import { CircleCheck, CircleSlash, FolderOpen } from "lucide-react";
import { resumenGeneral, tramitesAtorados, listarPropiedades } from "@/lib/queries";
import {
  Card,
  CardHeader,
  Stat,
  Badge,
  EtapaBadge,
  Barra,
  Vacio,
  Encabezado,
  MenuAcciones,
  OPCION_MENU,
} from "@/components/ui";
import { mxn } from "@/lib/constants";
import { exigirAdmin } from "@/lib/permisos";
import { cambiarEstadoTramite } from "@/acciones/propiedades";

export const dynamic = "force-dynamic";

const MOSTRAR = 12;

export default async function Tablero() {
  await exigirAdmin();

  const [resumen, atorados, propiedades] = await Promise.all([
    resumenGeneral(),
    tramitesAtorados(),
    listarPropiedades(),
  ]);

  const activas = propiedades.filter(
    (p) => p.etapa !== "concluida" && p.etapa !== "cancelada"
  );
  const atencion = resumen.tramitesVencidos + resumen.pagosSinComprobante;
  // Rendimiento esperado: margen sobre lo invertido. Solo si hay con qué calcularlo.
  const rendimiento =
    resumen.margenEsperado !== null && resumen.invertido > 0
      ? Math.round((resumen.margenEsperado / resumen.invertido) * 100)
      : null;

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Tablero"
        descripcion={`${resumen.activas} propiedades activas · ${resumen.tramitesPendientes} trámites por revisar`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Invertido" valor={mxn(resumen.invertido)} sub="Compra + gastos, activas" />
        <Stat label="Valor esperado" valor={mxn(resumen.valorEsperado)} sub="Venta estimada, activas" />
        <Stat
          label="Margen esperado"
          valor={resumen.margenEsperado === null ? "—" : mxn(resumen.margenEsperado)}
          insignia={
            rendimiento === null ? undefined : `${rendimiento > 0 ? "+" : ""}${rendimiento}%`
          }
          tono={rendimiento !== null && rendimiento < 0 ? "alerta" : "bien"}
          sub={
            resumen.margenEsperado === null
              ? "Faltan valores por capturar"
              : "Sobre lo invertido, antes de impuestos"
          }
        />
        <Stat
          label="Requieren atención"
          valor={atencion}
          insignia={atencion > 0 ? "Atender" : "Al día"}
          tono={atencion > 0 ? "alerta" : "bien"}
          sub={
            atencion > 0
              ? `${resumen.tramitesVencidos} vencidos · ${resumen.pagosSinComprobante} sin comprobante`
              : "Nada vencido"
          }
        />
      </div>

      <Card>
        <CardHeader
          titulo="Qué empujar hoy"
          extra={<span className="text-xs text-tenue tabular">{atorados.length} abiertos</span>}
        />
        {atorados.length === 0 ? (
          <Vacio icono={<CircleCheck className="h-6 w-6" strokeWidth={1.5} />} titulo="Nada atorado">
            O ya te pusiste al corriente, o falta capturar.
          </Vacio>
        ) : (
          <ul className="px-3 pb-3">
            {atorados.slice(0, MOSTRAR).map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
              >
                <span className="grid h-7 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-tenue tabular">
                  {t.catalogo.numero}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-medium">{t.catalogo.nombre}</span>
                    {t.vencido ? <Badge color="rose">Vencido</Badge> : null}
                    {t.pagoIncompleto ? <Badge color="amber">Sin comprobante</Badge> : null}
                    {t.estado === "revisar" ? <Badge color="amber">Revisar</Badge> : null}
                  </div>
                  <Link
                    href={`/propiedades/${encodeURIComponent(t.propiedad.id)}`}
                    className="text-xs text-tenue hover:text-brick-700"
                  >
                    {t.propiedad.nombre}
                  </Link>
                </div>

                <MenuAcciones etiqueta={`Acciones para ${t.catalogo.nombre}`}>
                  <Link
                    href={`/propiedades/${encodeURIComponent(t.propiedad.id)}?tab=expediente`}
                    className={OPCION_MENU}
                  >
                    <FolderOpen className="h-4 w-4 text-tenue" strokeWidth={1.75} />
                    Abrir expediente
                  </Link>
                  <form action={cambiarEstadoTramite}>
                    <input type="hidden" name="tramiteId" value={t.id} />
                    <input type="hidden" name="estado" value="completo" />
                    <button type="submit" className={OPCION_MENU}>
                      <CircleCheck className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
                      Marcar completo
                    </button>
                  </form>
                  <form action={cambiarEstadoTramite}>
                    <input type="hidden" name="tramiteId" value={t.id} />
                    <input type="hidden" name="estado" value="no_aplica" />
                    <button type="submit" className={OPCION_MENU}>
                      <CircleSlash className="h-4 w-4 text-tenue" strokeWidth={1.75} />
                      No aplica
                    </button>
                  </form>
                </MenuAcciones>
              </li>
            ))}
          </ul>
        )}
        {atorados.length > MOSTRAR ? (
          <div className="border-t border-linea/70 px-6 py-3 text-center text-xs text-tenue">
            y {atorados.length - MOSTRAR} más dentro de cada propiedad
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader titulo="Propiedades activas" />
        {activas.length === 0 ? (
          <Vacio>No hay propiedades activas.</Vacio>
        ) : (
          <ul className="px-3 pb-3">
            {activas.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/propiedades/${encodeURIComponent(p.id)}`}
                  className="block rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">{p.nombre}</span>
                      <EtapaBadge id={p.etapa} />
                    </div>
                    <span className="text-xs text-tenue tabular">
                      {p.progreso.completos}/{p.progreso.total} · {p.progreso.porcentaje}%
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <Barra porcentaje={p.progreso.porcentaje} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
