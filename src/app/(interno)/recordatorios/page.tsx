import Link from "next/link";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { recordatorios, type FilaRecordatorio } from "@/lib/queries";
import { MessageCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  Badge,
  Barra,
  Vacio,
  Encabezado,
  BOTON_EXITO,
  BOTON_SECUNDARIO,
} from "@/components/ui";
import { FormaInvitar } from "@/components/formularios";
import { fechaCorta } from "@/lib/constants";
import { urlDelPortal, mensajeWhatsApp, linkWhatsAppA } from "@/lib/invitaciones";
import { revocarInvitacion } from "@/acciones/equipo";

export const dynamic = "force-dynamic";

// Recordatorios. No manda nada solo: te dice a quién picarle, por qué, y te
// deja el mensaje escrito a un clic de WhatsApp.
//
// Es deliberado que no sea automático. Mandar mensajes solos exige la API de
// WhatsApp Business (aprobación de Meta y costo por conversación), y tú sabes
// cuándo un cliente prefiere una llamada a un mensaje.
//
// El cálculo de urgencia vive en src/lib/queries.ts, no aquí: es lógica de
// negocio y así se puede probar sin montar una pantalla.

function mensajePara(f: FilaRecordatorio, url: string): string {
  const primerNombre = f.invitacion.persona.nombre.split(" ")[0];

  if (f.rechazados > 0) {
    return (
      `Hola ${primerNombre}, hay ${f.rechazados} documento(s) de ` +
      `${f.invitacion.propiedad.nombre} que necesito que vuelvas a subir. ` +
      `Entra aquí y te digo cuál:\n\n${url}`
    );
  }
  return mensajeWhatsApp({
    nombre: f.invitacion.persona.nombre,
    propiedad: f.invitacion.propiedad.nombre,
    url,
    faltantes: f.faltan,
  });
}

function Fila({ f }: { f: FilaRecordatorio }) {
  const url = urlDelPortal(f.invitacion.token);
  const mensaje = mensajePara(f, url);
  const linkWa = linkWhatsAppA(f.invitacion.persona.telefono, mensaje);

  return (
    <li className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold">
            {f.invitacion.persona.nombre.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{f.invitacion.persona.nombre}</span>
            <Badge color={f.invitacion.rol === "comprador" ? "blue" : "violet"}>
              {f.invitacion.rol}
            </Badge>
            {f.nuncaAbrio ? <Badge color="rose">Nunca abrió el link</Badge> : null}
            {f.rechazados > 0 ? (
              <Badge color="amber">{f.rechazados} por corregir</Badge>
            ) : null}
            {f.vencido ? <Badge color="rose">Link vencido</Badge> : null}
          </div>

          <p className="mt-0.5 text-xs text-slate-500">
            <Link
              href={`/propiedades/${encodeURIComponent(f.invitacion.propiedadId)}`}
              className="font-medium text-brick-700 hover:underline"
            >
              {f.invitacion.propiedad.nombre}
            </Link>
            {f.invitacion.persona.telefono ? (
              <> · {f.invitacion.persona.telefono}</>
            ) : (
              <> · sin teléfono</>
            )}
            {" · "}
            {f.diasSinMoverse === 0
              ? "se movió hoy"
              : `${f.diasSinMoverse} ${
                  f.diasSinMoverse === 1 ? "día" : "días"
                } sin moverse`}
            {f.invitacion.expiraEn ? (
              <> · vence {fechaCorta(f.invitacion.expiraEn)}</>
            ) : null}
          </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {linkWa ? (
            <a href={linkWa} target="_blank" rel="noreferrer" className={BOTON_EXITO}>
              <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              Mandar por WhatsApp
            </a>
          ) : (
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-tenue">
              Falta su teléfono
            </span>
          )}
          <form action={revocarInvitacion}>
            <input type="hidden" name="invitacionId" value={f.invitacion.id} />
            <button type="submit" className={BOTON_SECUNDARIO}>
              Revocar
            </button>
          </form>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 sm:pl-[54px]">
        <div className="flex-1">
          <Barra porcentaje={f.porcentaje} />
        </div>
        <span className="shrink-0 text-xs text-slate-500 tabular">
          {f.entregados}/{f.total} entregados
        </span>
      </div>

      <details className="mt-3 sm:pl-[54px]">
        <summary className="cursor-pointer list-none text-xs font-medium text-tenue hover:text-tinta">
          Ver el mensaje y el link
        </summary>
        <div className="mt-2 space-y-2">
          <pre className="whitespace-pre-wrap rounded-2xl bg-fondo p-4 font-sans text-xs text-slate-600">
            {mensaje}
          </pre>
          <p className="break-all font-mono text-xs text-slate-400">{url}</p>
        </div>
      </details>
    </li>
  );
}

export default async function Recordatorios() {
  await exigirAdmin();

  const [filas, propiedades] = await Promise.all([
    recordatorios(),
    db.propiedad.findMany({
      where: { etapa: { notIn: ["concluida", "cancelada"] } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const requierenEmpujon = filas.filter((f) => f.urgencia > 0);
  const alCorriente = filas.filter((f) => f.urgencia === 0);

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Recordatorios"
        descripcion={
          requierenEmpujon.length === 0
            ? "Nadie necesita que le insistas hoy"
            : `${requierenEmpujon.length} ${
                requierenEmpujon.length === 1 ? "persona necesita" : "personas necesitan"
              } un empujón`
        }
      />

      <div id="invitar" className="scroll-mt-24">
        <Card>
          <CardHeader titulo="Mandar un link nuevo" />
          {propiedades.length === 0 ? (
            <Vacio>No hay propiedades activas.</Vacio>
          ) : (
            <FormaInvitar propiedades={propiedades} />
          )}
        </Card>
      </div>

      {[
        { titulo: "Necesitan un empujón", items: requierenEmpujon },
        { titulo: "Al corriente", items: alCorriente },
      ].map((seccion) =>
        seccion.items.length === 0 ? null : (
          <Card key={seccion.titulo}>
            <CardHeader
              titulo={seccion.titulo}
              extra={<span className="text-xs text-slate-500">{seccion.items.length}</span>}
            />
            <ul className="divide-y divide-slate-100">
              {seccion.items.map((f) => (
                <Fila key={f.invitacion.id} f={f} />
              ))}
            </ul>
          </Card>
        )
      )}

      {filas.length === 0 ? (
        <Card>
          <Vacio>Todavía no has mandado ningún link. Genera el primero arriba.</Vacio>
        </Card>
      ) : null}
    </div>
  );
}
