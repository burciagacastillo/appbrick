"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";
import { crearInvitacion } from "@/lib/invitaciones";

// Alta de accesos: a quién le dejas ver qué.
// Todo exige admin — dar acceso a documentos de identidad de terceros no es
// una decisión que delegues.

/** Le da acceso a un ayudante sobre una propiedad. */
export async function darAccesoAyudante(formData: FormData) {
  const admin = await exigirAdmin();
  const usuarioId = String(formData.get("usuarioId"));
  const propiedadId = String(formData.get("propiedadId"));
  const dias = String(formData.get("dias") ?? "").trim();

  // Acceso temporal: si le pones días, se vence solo y no se te olvida quitarlo.
  let expiraEn: Date | null = null;
  if (dias) {
    expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + Number(dias));
  }

  await db.accesoAyudante.upsert({
    where: { usuarioId_propiedadId: { usuarioId, propiedadId } },
    update: { expiraEn },
    create: { usuarioId, propiedadId, expiraEn },
  });

  const [usuario, propiedad] = await Promise.all([
    db.usuario.findUnique({ where: { id: usuarioId } }),
    db.propiedad.findUnique({ where: { id: propiedadId } }),
  ]);

  await registrar({
    tipoActor: "admin",
    actor: admin.nombre,
    accion: "creo_invitacion",
    entidad: "propiedad",
    entidadId: propiedadId,
    detalle:
      `Acceso de ayudante a ${usuario?.nombre} sobre ${propiedad?.nombre}` +
      (expiraEn ? ` hasta ${expiraEn.toLocaleDateString("es-MX")}` : " (sin vencimiento)"),
  });

  revalidatePath("/", "layout");
}

export async function quitarAccesoAyudante(formData: FormData) {
  const admin = await exigirAdmin();
  const id = String(formData.get("accesoId"));

  const acceso = await db.accesoAyudante.findUnique({
    where: { id },
    include: { usuario: true, propiedad: true },
  });
  if (!acceso) return;

  await db.accesoAyudante.delete({ where: { id } });

  await registrar({
    tipoActor: "admin",
    actor: admin.nombre,
    accion: "revoco_invitacion",
    entidad: "propiedad",
    entidadId: acceso.propiedadId,
    detalle: `Se le quitó acceso a ${acceso.usuario.nombre} sobre ${acceso.propiedad.nombre}`,
  });

  revalidatePath("/", "layout");
}

/**
 * Crea (o recrea) el link de un comprador o vendedor.
 * Si la persona no existe todavía, se da de alta con nombre y teléfono: así
 * puedes mandar el link sin capturar antes un expediente completo.
 */
export async function invitarPersona(formData: FormData) {
  const admin = await exigirAdmin();
  const propiedadId = String(formData.get("propiedadId"));
  const rol = String(formData.get("rol")) as "comprador" | "vendedor";
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!nombre) throw new Error("Falta el nombre de la persona.");
  if (rol !== "comprador" && rol !== "vendedor") {
    throw new Error("El rol debe ser comprador o vendedor.");
  }

  let persona = await db.persona.findFirst({ where: { nombre } });
  if (!persona) {
    persona = await db.persona.create({
      data: { nombre, telefono: telefono || null },
    });
  } else if (telefono && !persona.telefono) {
    persona = await db.persona.update({
      where: { id: persona.id },
      data: { telefono },
    });
  }

  await db.propiedadPersona.upsert({
    where: { propiedadId_personaId_rol: { propiedadId, personaId: persona.id, rol } },
    update: {},
    create: { propiedadId, personaId: persona.id, rol },
  });

  await crearInvitacion({
    propiedadId,
    personaId: persona.id,
    rol,
    creadaPor: admin.nombre,
  });

  revalidatePath("/", "layout");
}

export async function revocarInvitacion(formData: FormData) {
  const admin = await exigirAdmin();
  const id = String(formData.get("invitacionId"));

  const invitacion = await db.invitacion.update({
    where: { id },
    data: { revocada: true },
    include: { persona: true, propiedad: true },
  });

  await registrar({
    tipoActor: "admin",
    actor: admin.nombre,
    accion: "revoco_invitacion",
    entidad: "invitacion",
    entidadId: invitacion.id,
    detalle: `${invitacion.persona.nombre} — ${invitacion.propiedad.nombre}`,
  });

  revalidatePath("/", "layout");
}
