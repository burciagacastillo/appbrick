"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";
import { crearInvitacion } from "@/lib/invitaciones";
import {
  validar,
  validarOTronar,
  EsquemaAccesoAyudante,
  EsquemaInvitar,
} from "@/lib/esquemas";

// Alta de accesos: a quién le dejas ver qué.
// Todo exige admin — dar acceso a documentos de identidad de terceros no es
// una decisión que delegues.

/** Le da acceso a un ayudante sobre una propiedad. */
export async function darAccesoAyudante(formData: FormData) {
  const admin = await exigirAdmin();
  const { usuarioId, propiedadId, dias } = validarOTronar(
    EsquemaAccesoAyudante,
    formData
  );

  // Acceso temporal: si le pones días, se vence solo y no se te olvida quitarlo.
  let expiraEn: Date | null = null;
  if (dias) {
    expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + dias);
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

  revalidatePath("/equipo");
  revalidatePath("/ayudante");
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

  revalidatePath("/equipo");
  revalidatePath("/ayudante");
}

/**
 * Crea (o recrea) el link de un comprador o vendedor.
 * Si la persona no existe todavía, se da de alta con nombre y teléfono: así
 * puedes mandar el link sin capturar antes un expediente completo.
 */
export type ResultadoInvitar = { ok: true } | { ok: false; error: string };

export async function invitarPersona(
  _previo: ResultadoInvitar | null,
  formData: FormData
): Promise<ResultadoInvitar> {
  const admin = await exigirAdmin();

  const v = validar(EsquemaInvitar, formData);
  if (!v.ok) return { ok: false, error: v.error };
  const { propiedadId, rol, nombre, telefono } = v.datos;

  // Identificar a la persona por nombre es peligroso: dos "José García" se
  // fusionarían y el segundo heredaría el CURP y el crédito del primero.
  // Con teléfono la coincidencia es fiable; sin él, se pide desambiguar.
  let persona = telefono
    ? await db.persona.findFirst({ where: { nombre, telefono } })
    : null;

  if (!persona) {
    const mismoNombre = await db.persona.findMany({ where: { nombre } });

    if (mismoNombre.length === 1 && !telefono) {
      persona = mismoNombre[0];
    } else if (mismoNombre.length > 1 && !telefono) {
      return {
        ok: false,
        error: `Ya hay ${mismoNombre.length} personas llamadas "${nombre}". Pon su teléfono para no confundirlas.`,
      };
    } else {
      persona = await db.persona.create({
        data: { nombre, telefono: telefono ?? null },
      });
    }
  }

  if (telefono && !persona.telefono) {
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

  revalidatePath("/recordatorios");
  revalidatePath(`/propiedades/${propiedadId}`);
  return { ok: true };
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

  revalidatePath("/recordatorios");
}
