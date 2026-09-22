import { db } from "./db";
import { generarToken } from "./cripto";
import { registrar } from "./bitacora";

// El link que le mandas por WhatsApp al comprador o al vendedor.
//
// Diseño: sin cuenta, sin contraseña. El token ES la credencial, así que
// todo lo que sigue gira alrededor de tratarlo como tal — se puede revocar,
// puede expirar, y cada uso queda registrado.

/** Qué bloque del checklist le toca a cada quien. */
const BLOQUES_POR_ROL: Record<string, string> = {
  comprador: "B",
  vendedor: "A",
};

/** Vigencia por defecto del link: 60 días. Un trámite Infonavit rara vez dura más. */
const DIAS_VIGENCIA = 60;

export async function crearInvitacion(opciones: {
  propiedadId: string;
  personaId: string;
  rol: "comprador" | "vendedor";
  diasVigencia?: number;
  creadaPor: string;
}) {
  const bloques = BLOQUES_POR_ROL[opciones.rol];
  if (!bloques) throw new Error(`Rol de invitación no válido: ${opciones.rol}`);

  const expiraEn = new Date();
  expiraEn.setDate(expiraEn.getDate() + (opciones.diasVigencia ?? DIAS_VIGENCIA));

  // Se revocan las invitaciones previas de esa persona para esa propiedad.
  // Si no, un link viejo reenviado por WhatsApp sigue funcionando para siempre.
  await db.invitacion.updateMany({
    where: {
      propiedadId: opciones.propiedadId,
      personaId: opciones.personaId,
      revocada: false,
    },
    data: { revocada: true },
  });

  const invitacion = await db.invitacion.create({
    data: {
      token: generarToken(),
      propiedadId: opciones.propiedadId,
      personaId: opciones.personaId,
      rol: opciones.rol,
      bloquesPermitidos: bloques,
      expiraEn,
    },
    include: { persona: true, propiedad: true },
  });

  await registrar({
    tipoActor: "admin",
    actor: opciones.creadaPor,
    accion: "creo_invitacion",
    entidad: "invitacion",
    entidadId: invitacion.id,
    detalle: `${opciones.rol} ${invitacion.persona.nombre} — ${invitacion.propiedad.nombre}`,
  });

  return invitacion;
}

export type MotivoInvalidez = "no_existe" | "revocada" | "expirada";

/**
 * Valida el token del link. Devuelve la invitación con todo lo que el portal
 * necesita, o el motivo por el que no sirve — para poder explicárselo al
 * usuario en lenguaje llano en vez de un 404 seco.
 */
export async function validarToken(token: string) {
  const invitacion = await db.invitacion.findUnique({
    where: { token },
    include: {
      persona: true,
      propiedad: {
        include: {
          tramites: {
            include: {
              catalogo: true,
              documentos: { orderBy: { creadoEn: "desc" } },
            },
            orderBy: { catalogo: { numero: "asc" } },
          },
        },
      },
    },
  });

  if (!invitacion) return { ok: false as const, motivo: "no_existe" as const };
  if (invitacion.revocada) return { ok: false as const, motivo: "revocada" as const };
  if (invitacion.expiraEn && invitacion.expiraEn < new Date()) {
    return { ok: false as const, motivo: "expirada" as const };
  }

  // Solo lo que le toca a ESTA persona: su bloque, y solo lo que sube el
  // invitado. Los trámites municipales y el dinero no existen para él.
  const bloques = invitacion.bloquesPermitidos.split(",").map((b) => b.trim());
  const tramites = invitacion.propiedad.tramites.filter(
    (t) => bloques.includes(t.catalogo.bloque) && t.catalogo.loSubeInvitado
  );

  return { ok: true as const, invitacion, tramites };
}

export type InvitacionValida = Extract<
  Awaited<ReturnType<typeof validarToken>>,
  { ok: true }
>;

/** Media hora: dos entradas dentro de esa ventana son la misma visita. */
const MINUTOS_MISMA_VISITA = 30;

/**
 * Marca que el link se usó. Sirve para saber si el comprador ni lo abrió.
 *
 * El contador agrupa por visita, no por carga de pantalla: la página se
 * repinta con cada subida y cada revalidación, así que contar renders daría
 * "usado 21 veces" cuando el comprador entró una sola vez.
 */
export async function registrarAcceso(invitacionId: string) {
  const actual = await db.invitacion.findUnique({
    where: { id: invitacionId },
    select: { ultimoAcceso: true },
  });

  const corte = new Date(Date.now() - MINUTOS_MISMA_VISITA * 60_000);
  const esVisitaNueva = !actual?.ultimoAcceso || actual.ultimoAcceso < corte;

  await db.invitacion.update({
    where: { id: invitacionId },
    data: {
      ultimoAcceso: new Date(),
      ...(esVisitaNueva ? { vecesUsada: { increment: 1 } } : {}),
    },
  });
}

/** El link completo, listo para pegarse en WhatsApp. */
export function urlDelPortal(token: string, base?: string): string {
  const raiz = base ?? process.env.APPBRICK_URL ?? "http://localhost:3000";
  return `${raiz}/subir/${token}`;
}

/** Mensaje listo para mandar, con el link dentro. */
export function mensajeWhatsApp(opciones: {
  nombre: string;
  propiedad: string;
  url: string;
  faltantes: number;
}): string {
  const primerNombre = opciones.nombre.split(" ")[0];
  return (
    `Hola ${primerNombre}, aquí puedes subir los documentos para ${opciones.propiedad}. ` +
    `Te faltan ${opciones.faltantes}. Entras desde el celular y puedes tomarles foto:\n\n` +
    opciones.url
  );
}

/**
 * Normaliza un teléfono mexicano a formato internacional para wa.me.
 * Acepta "614 496 7308", "6144967308", "+52 614 496 7308" y devuelve
 * "526144967308". Si no se puede, devuelve null y la UI oculta el botón.
 */
export function telefonoWhatsApp(telefono: string | null): string | null {
  if (!telefono) return null;

  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length === 10) return `52${digitos}`;
  if (digitos.length === 12 && digitos.startsWith("52")) return digitos;
  // 13 dígitos = 52 + 1 + 10, el formato viejo de México.
  if (digitos.length === 13 && digitos.startsWith("521")) return `52${digitos.slice(3)}`;
  return null;
}

/** Link de WhatsApp a una persona concreta, con el mensaje ya escrito. */
export function linkWhatsAppA(telefono: string | null, mensaje: string): string | null {
  const numero = telefonoWhatsApp(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
