"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { validarToken } from "@/lib/invitaciones";
import { registrar } from "@/lib/bitacora";
import { prepararSubidaDirecta } from "@/lib/almacen";
import { recibirArchivo, guardarDocumento } from "@/lib/subida";

export type ResultadoSubida = { ok: true; mensaje: string } | { ok: false; error: string };
export type PermisoSubida = { ruta: string; url: string } | null | { error: string };

/** 7 documentos del bloque, con margen para correcciones y reintentos. */
const MAXIMO_POR_INVITACION = 40;

/**
 * Revisa que ESTE link pueda subir a ESTE trámite. Toda la seguridad del
 * portal cuelga del token: se revalida en cada paso, y el trámite se busca en
 * la lista de lo que esa invitación puede tocar. Sin eso, alguien con un link
 * de comprador podría mandar un tramiteId ajeno.
 */
async function autorizar(token: string, tramiteId: string) {
  const validacion = await validarToken(token);
  if (!validacion.ok) {
    return { ok: false as const, error: "Tu link ya no es válido. Pídele uno nuevo a Erick." };
  }
  const { invitacion, tramites } = validacion;

  if (!invitacion.avisoAceptadoEn) {
    return { ok: false as const, error: "Primero tienes que aceptar el aviso de privacidad." };
  }

  const tramite = tramites.find((t) => t.id === tramiteId);
  if (!tramite) {
    return { ok: false as const, error: "Ese documento no corresponde a tu lista." };
  }

  // Tope por invitación: sin esto, un link válido durante 60 días puede
  // llenar el almacén con archivos de 20 MB.
  const yaSubidos = await db.documento.count({
    where: { subidoPorInvitacionId: invitacion.id },
  });
  if (yaSubidos >= MAXIMO_POR_INVITACION) {
    return {
      ok: false as const,
      error: "Ya subiste demasiados archivos. Habla con Erick para continuar.",
    };
  }

  return { ok: true as const, invitacion, tramite };
}

/**
 * Paso 1 (solo publicada): permiso para mandar el archivo directo a la sala
 * de espera. Pide las mismas credenciales que subir: sin link válido no hay
 * permiso. En tu computadora devuelve null y el archivo va por el formulario.
 */
export async function prepararSubidaInvitado(
  token: string,
  tramiteId: string
): Promise<PermisoSubida> {
  const permiso = await autorizar(token, tramiteId);
  if (!permiso.ok) return { error: permiso.error };
  return prepararSubidaDirecta();
}

/** Paso 2: recibe el archivo (adjunto o ya en la sala de espera) y lo registra. */
export async function subirDocumento(
  _previo: ResultadoSubida | null,
  formData: FormData
): Promise<ResultadoSubida> {
  const token = String(formData.get("token") ?? "");
  const tramiteId = String(formData.get("tramiteId") ?? "");

  const permiso = await autorizar(token, tramiteId);
  if (!permiso.ok) {
    // Si ya había mandado el archivo a la sala de espera, no se queda ahí.
    await recibirArchivo(formData);
    return { ok: false, error: permiso.error };
  }
  const { invitacion, tramite } = permiso;

  const archivo = await recibirArchivo(formData);
  if (!archivo.ok) return archivo;

  const guardado = await guardarDocumento({
    propiedad: invitacion.propiedad,
    tramite,
    subTipo: null,
    contenido: archivo.contenido,
    nombreOriginal: archivo.nombreOriginal,
    estado: "pendiente",
    subidoPor: { tipo: "invitado", invitacionId: invitacion.id },
  });
  if (!guardado.ok) return guardado;
  if (guardado.duplicado) return { ok: true, mensaje: "Ese archivo ya lo habías subido." };

  // El trámite pasa a "revisar": llegó algo, pero Erick todavía no lo valida.
  await db.tramite.update({
    where: { id: tramite.id },
    data: { estado: "revisar", docRecibido: true },
  });

  await registrar({
    tipoActor: "invitado",
    actor: `${invitacion.persona.nombre} (${invitacion.rol})`,
    accion: "subio",
    entidad: "documento",
    entidadId: guardado.documentoId,
    detalle: `${tramite.catalogo.numero} ${tramite.catalogo.nombre} — ${invitacion.propiedad.nombre}`,
  });

  revalidatePath(`/subir/${token}`);
  revalidatePath("/", "layout");

  return { ok: true, mensaje: "Listo, ya lo recibimos. Erick lo va a revisar." };
}

/** LFPDPPP: hay que poder probar que aceptó, con fecha. */
export async function aceptarAviso(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  const validacion = await validarToken(token);
  if (!validacion.ok) return;

  await db.invitacion.update({
    where: { id: validacion.invitacion.id },
    data: { avisoAceptadoEn: new Date() },
  });

  await registrar({
    tipoActor: "invitado",
    actor: validacion.invitacion.persona.nombre,
    accion: "acepto_aviso",
    entidad: "invitacion",
    entidadId: validacion.invitacion.id,
  });

  revalidatePath(`/subir/${token}`);
}
