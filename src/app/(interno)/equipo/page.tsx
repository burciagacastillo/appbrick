import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { Check, X } from "lucide-react";
import {
  Card,
  CardHeader,
  Badge,
  Vacio,
  CLASE_CAMPO,
  Encabezado,
  BOTON_PRIMARIO,
} from "@/components/ui";
import { fechaCorta } from "@/lib/constants";
import { darAccesoAyudante, quitarAccesoAyudante } from "@/acciones/equipo";

export const dynamic = "force-dynamic";

// Quién de tu equipo ve qué. El ayudante no ve nada hasta que le asignas
// propiedades aquí — arranca sin acceso, no con acceso a todo.

export default async function Equipo() {
  await exigirAdmin();

  const [ayudantes, propiedades, bitacora] = await Promise.all([
    db.usuario.findMany({
      where: { rol: "ayudante" },
      include: {
        accesos: { include: { propiedad: { select: { id: true, nombre: true } } } },
      },
      orderBy: { nombre: "asc" },
    }),
    db.propiedad.findMany({
      where: { etapa: { notIn: ["cancelada"] } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    db.bitacora.findMany({
      where: { tipoActor: { in: ["ayudante", "invitado"] } },
      orderBy: { cuando: "desc" },
      take: 25,
    }),
  ]);

  
  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Equipo"
        descripcion={
          ayudantes.length === 0
            ? "Todavía no hay ayudantes dados de alta"
            : `${ayudantes.length} ${ayudantes.length === 1 ? "ayudante" : "ayudantes"}`
        }
      />

      {/* Lo que un ayudante ve y lo que no: la regla, a la vista. */}
      <Card className="p-6">
        <h2 className="text-[15px] font-semibold tracking-tight">Qué ve un ayudante</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <ul className="space-y-2.5 text-sm">
            {[
              "Los documentos de las propiedades que le asignes",
              "Puede abrirlos y descargarlos",
              "Cada vista y descarga queda en la bitácora",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
                {t}
              </li>
            ))}
          </ul>
          <ul className="space-y-2.5 text-sm text-tenue">
            {[
              "Gastos, compras, márgenes ni comisiones",
              "Precios internos ni la cuenta entre socios",
              "Contraseñas de Infonavit ni datos personales",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {ayudantes.length === 0 ? (
        <Card>
          <Vacio>
            Para dar de alta a un ayudante corre{" "}
            <code className="rounded bg-slate-100 px-1">
              npm run usuario
            </code>{" "}
            en la terminal y elige la opción 2. Después regresa aquí para
            asignarle propiedades.
          </Vacio>
        </Card>
      ) : (
        ayudantes.map((a) => (
          <Card key={a.id}>
            <CardHeader
              titulo={a.nombre}
              extra={
                <span className="text-xs text-slate-500">
                  {a.email} · {a.accesos.length}{" "}
                  {a.accesos.length === 1 ? "propiedad" : "propiedades"}
                </span>
              }
            />

            {a.accesos.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {a.accesos.map((acceso) => {
                  const vencido =
                    acceso.expiraEn != null && acceso.expiraEn < new Date();
                  return (
                    <li
                      key={acceso.id}
                      className="flex items-center justify-between gap-3 px-6 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">{acceso.propiedad.nombre}</span>
                        {acceso.expiraEn ? (
                          <Badge color={vencido ? "rose" : "amber"}>
                            {vencido ? "Venció " : "Hasta "}
                            {fechaCorta(acceso.expiraEn)}
                          </Badge>
                        ) : (
                          <Badge>Sin vencimiento</Badge>
                        )}
                      </div>
                      <form action={quitarAccesoAyudante}>
                        <input type="hidden" name="accesoId" value={acceso.id} />
                        <button
                          type="submit"
                          className="text-xs text-slate-400 hover:text-rose-600"
                        >
                          Quitar acceso
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Vacio>Sin propiedades asignadas: hoy no puede ver nada.</Vacio>
            )}

            <form
              action={darAccesoAyudante}
              className="grid gap-3 border-t border-linea/60 px-6 py-5 sm:grid-cols-4"
            >
              <input type="hidden" name="usuarioId" value={a.id} />
              <label className="text-xs sm:col-span-2">
                <span className="text-slate-500">Darle acceso a</span>
                <select name="propiedadId" className={CLASE_CAMPO} required>
                  {propiedades.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="text-slate-500">Por cuántos días</span>
                <input
                  type="number"
                  name="dias"
                  min="1"
                  placeholder="vacío = siempre"
                  className={CLASE_CAMPO}
                />
              </label>
              <div className="flex items-end">
                <button type="submit" className={BOTON_PRIMARIO}>
                  Dar acceso
                </button>
              </div>
            </form>
          </Card>
        ))
      )}

      <Card>
        <CardHeader
          titulo="Bitácora"
          extra={
            <span className="text-xs text-slate-500">
              Movimientos de ayudantes e invitados
            </span>
          }
        />
        {bitacora.length === 0 ? (
          <Vacio>Sin movimientos todavía.</Vacio>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {bitacora.map((b) => (
              <li key={b.id} className="flex flex-wrap gap-x-2 px-6 py-2.5">
                <span className="text-xs text-slate-400 tabular">
                  {b.cuando.toLocaleString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="font-medium">{b.actor}</span>
                <span className="text-slate-500">
                  {b.accion.replace(/_/g, " ")} {b.entidad}
                </span>
                {b.detalle ? (
                  <span className="text-xs text-slate-400">· {b.detalle}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
