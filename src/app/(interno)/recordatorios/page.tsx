import Link from "next/link";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { Card, CardHeader, Badge, Barra, Vacio } from "@/components/ui";
import { fechaCorta } from "@/lib/constants";
import {
  urlDelPortal,
  mensajeWhatsApp,
  linkWhatsAppA,
} from "@/lib/invitaciones";
import { invitarPersona, revocarInvitacion } from "@/acciones/equipo";

export const dynamic = "force-dynamic";

// Recordatorios. No manda nada solo: te dice a quién picarle, por qué, y te
// deja el mensaje escrito a un clic de WhatsApp.
//
// Es deliberado que no sea automático. Mandar mensajes solos exige la API de
// WhatsApp Business (aprobación de Meta y costo por conversación), y tú
// sabes cuándo un cliente prefiere una llamada a un mensaje.

const DIAS_PARA_INSISTIR = 3;

function diasDesde(fecha: Date | null): number | null {
  if (!fecha) return null;
  return Math.floor((Date.now() - fecha.getTime()) / 86_400_000);
}

export default async function Recordatorios() {
  await exigirAdmin();

  const invitaciones = await db.invitacion.findMany({
    where: { revocada: false },
    include: {
      persona: true,
      propiedad: {
        include: {
          tramites: {
            include: { catalogo: true, documentos: true },
          },
        },
      },
    },
    orderBy: { creadaEn: "desc" },
  });

  const propiedades = await db.propiedad.findMany({
    where: { etapa: { notIn: ["concluida", "cancelada"] } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  const filas = invitaciones
    .map((i) => {
      const bloques = i.bloquesPermitidos.split(",").map((b) => b.trim());
      const suyos = i.propiedad.tramites.filter(
        (t) => bloques.includes(t.catalogo.bloque) && t.catalogo.loSubeInvitado
      );

      const entregados = suyos.filter((t) =>
        t.documentos.some((d) => d.estado !== "rechazado")
      ).length;
      const rechazados = suyos.filter(
        (t) =>
          t.documentos.length > 0 &&
          t.documentos.every((d) => d.estado === "rechazado")
      ).length;

      const faltan = suyos.length - entregados;
      const porcentaje =
        suyos.length === 0 ? 0 : Math.round((entregados / suyos.length) * 100);

      // La última señal de vida: subió algo, o al menos abrió el link.
      const ultimaSubida = i.propiedad.tramites
        .flatMap((t) => t.documentos)
        .filter((d) => d.subidoPorInvitacionId === i.id)
        .map((d) => d.creadoEn)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

      const diasSinMoverse = diasDesde(ultimaSubida ?? i.ultimoAcceso ?? i.creadaEn);
      const nuncaAbrio = i.vecesUsada === 0;
      const vencido = i.expiraEn != null && i.expiraEn < new Date();

      // Prioridad: lo más urgente primero.
      let urgencia = 0;
      if (faltan > 0 && nuncaAbrio) urgencia += 100; // ni siquiera entró
      if (rechazados > 0) urgencia += 60; // tiene que corregir algo
      if (faltan > 0 && (diasSinMoverse ?? 0) >= DIAS_PARA_INSISTIR) urgencia += 40;
      if (vencido) urgencia += 30;

      const url = urlDelPortal(i.token);
      const mensaje =
        rechazados > 0
          ? `Hola ${i.persona.nombre.split(" ")[0]}, hay ${rechazados} documento(s) de ${i.propiedad.nombre} que necesito que vuelvas a subir. Entra aquí y te digo cuál:\n\n${url}`
          : mensajeWhatsApp({
              nombre: i.persona.nombre,
              propiedad: i.propiedad.nombre,
              url,
              faltantes: faltan,
            });

      return {
        invitacion: i,
        total: suyos.length,
        entregados,
        faltan,
        rechazados,
        porcentaje,
        diasSinMoverse,
        nuncaAbrio,
        vencido,
        url,
        linkWa: linkWhatsAppA(i.persona.telefono, mensaje),
        mensaje,
        urgencia,
      };
    })
    .sort((a, b) => b.urgencia - a.urgencia);

  const requierenEmpujon = filas.filter((f) => f.urgencia > 0);
  const alCorriente = filas.filter((f) => f.urgencia === 0);

  const input =
    "mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-brick-700 dark:bg-brick-900";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Recordatorios</h1>
        <p className="text-sm text-slate-500">
          {requierenEmpujon.length === 0
            ? "Nadie necesita que le insistas hoy."
            : `${requierenEmpujon.length} ${
                requierenEmpujon.length === 1 ? "persona necesita" : "personas necesitan"
              } un empujón`}
        </p>
      </div>

      {/* Crear un link nuevo */}
      <Card>
        <CardHeader titulo="Mandar un link nuevo" />
        {propiedades.length === 0 ? (
          <Vacio>No hay propiedades activas.</Vacio>
        ) : (
          <form action={invitarPersona} className="grid gap-2 px-4 py-3 sm:grid-cols-5">
            <label className="text-xs sm:col-span-2">
              <span className="text-slate-500">Propiedad</span>
              <select name="propiedadId" className={input} required>
                {propiedades.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Es el…</span>
              <select name="rol" className={input} defaultValue="comprador">
                <option value="comprador">Comprador</option>
                <option value="vendedor">Vendedor</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="text-slate-500">Nombre</span>
              <input name="nombre" required placeholder="Edgar Vázquez" className={input} />
            </label>
            <label className="text-xs">
              <span className="text-slate-500">WhatsApp</span>
              <input name="telefono" placeholder="614 123 4567" className={input} />
            </label>
            <div className="sm:col-span-5">
              <button
                type="submit"
                className="rounded-md bg-brick-800 px-4 py-2 text-sm font-medium text-white hover:bg-brick-700"
              >
                Generar link
              </button>
              <span className="ml-3 text-xs text-slate-500">
                Si ya tenía uno, el anterior deja de funcionar.
              </span>
            </div>
          </form>
        )}
      </Card>

      {[
        { titulo: "Necesitan un empujón", items: requierenEmpujon },
        { titulo: "Al corriente", items: alCorriente },
      ].map((seccion) =>
        seccion.items.length === 0 ? null : (
          <Card key={seccion.titulo}>
            <CardHeader
              titulo={seccion.titulo}
              extra={
                <span className="text-xs text-slate-500">{seccion.items.length}</span>
              }
            />
            <ul className="divide-y divide-slate-100 dark:divide-brick-700">
              {seccion.items.map((f) => (
                <li key={f.invitacion.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{f.invitacion.persona.nombre}</span>
                        <Badge color={f.invitacion.rol === "comprador" ? "blue" : "violet"}>
                          {f.invitacion.rol}
                        </Badge>
                        {f.nuncaAbrio ? <Badge color="rose">Nunca abrió el link</Badge> : null}
                        {f.rechazados > 0 ? (
                          <Badge color="amber">
                            {f.rechazados} por corregir
                          </Badge>
                        ) : null}
                        {f.vencido ? <Badge color="rose">Link vencido</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <Link
                          href={`/propiedades/${encodeURIComponent(f.invitacion.propiedadId)}`}
                          className="font-medium text-brick-700 hover:underline dark:text-gold-400"
                        >
                          {f.invitacion.propiedad.nombre}
                        </Link>
                        {f.invitacion.persona.telefono ? (
                          <> · {f.invitacion.persona.telefono}</>
                        ) : (
                          <> · sin teléfono</>
                        )}
                        {f.diasSinMoverse != null ? (
                          <>
                            {" · "}
                            {f.diasSinMoverse === 0
                              ? "se movió hoy"
                              : `${f.diasSinMoverse} ${
                                  f.diasSinMoverse === 1 ? "día" : "días"
                                } sin moverse`}
                          </>
                        ) : null}
                        {f.invitacion.expiraEn ? (
                          <> · vence {fechaCorta(f.invitacion.expiraEn)}</>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {f.linkWa ? (
                        <a
                          href={f.linkWa}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          Mandar por WhatsApp
                        </a>
                      ) : (
                        <span className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-brick-700">
                          Falta su teléfono
                        </span>
                      )}
                      <form action={revocarInvitacion}>
                        <input type="hidden" name="invitacionId" value={f.invitacion.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 dark:border-brick-700 dark:hover:bg-brick-800"
                        >
                          Revocar
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1">
                      <Barra porcentaje={f.porcentaje} />
                    </div>
                    <span className="shrink-0 text-xs text-slate-500 tabular">
                      {f.entregados}/{f.total} entregados
                    </span>
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer list-none text-xs text-brick-700 hover:underline dark:text-gold-400">
                      Ver el mensaje y el link
                    </summary>
                    <div className="mt-2 space-y-2">
                      <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-brick-800 dark:text-slate-300">
                        {f.mensaje}
                      </pre>
                      <p className="break-all font-mono text-xs text-slate-400">{f.url}</p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        )
      )}

      {filas.length === 0 ? (
        <Card>
          <Vacio>
            Todavía no has mandado ningún link. Genera el primero arriba.
          </Vacio>
        </Card>
      ) : null}
    </div>
  );
}
