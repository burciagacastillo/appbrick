"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { validarToken } from "@/lib/invitaciones";
import { registrar } from "@/lib/bitacora";
import { hashArchivo } from "@/lib/cripto";
import {
  guardar,
  carpetaDe,
  validarArchivo,
  nombrarConConvencion,
} from "@/lib/almacen";

export type ResultadoSubida = { ok: true; mensaje: string } | { ok: false; error: string };

/** 7 documentos del bloque, con margen para correcciones y reintentos. */
const MAXIMO_POR_INVITACION = 40;

/**
 * Sube un documento desde el portal del invitado.
 *
 * Toda la seguridad cuelga del token: se revalida en cada subida, y el trámite
 * destino se verifica contra la lista de lo que ESA invitación puede tocar.
 * Sin eso, alguien con un link de comprador podría mandar un tramiteId ajeno.
 */
export async function subirDocumento(
  _previo: ResultadoSubida | null,
  formData: FormData
): Promise<ResultadoSubida> {
  const token = String(formData.get("token") ?? "");
  const tramiteId = String(formData.get("tramiteId") ?? "");
  const archivo = formData.get("archivo");

  const validacion = await validarToken(token);
  if (!validacion.ok) {
    return { ok: false, error: "Tu link ya no es válido. Pídele uno nuevo a Erick." };
  }
  const { invitacion, tramites } = validacion;

  if (!invitacion.avisoAceptadoEn) {
    return { ok: false, error: "Primero tienes que aceptar el aviso de privacidad." };
  }

  // El trámite debe estar entre los que ESTA invitación puede tocar.
  const tramite = tramites.find((t) => t.id === tramiteId);
  if (!tramite) {
    return { ok: false, error: "Ese documento no corresponde a tu lista." };
  }

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "No llegó ningún archivo. Inténtalo otra vez." };
  }

  // Tope por invitación: sin esto, un link válido durante 60 días puede
  // llenar el disco con archivos de 20 MB.
  const yaSubidos = await db.documento.count({
    where: { subidoPorInvitacionId: invitacion.id },
  });
  if (yaSubidos >= MAXIMO_POR_INVITACION) {
    return {
      ok: false,
      error: "Ya subiste demasiados archivos. Habla con Erick para continuar.",
    };
  }

  const contenido = Buffer.from(await archivo.arrayBuffer());

  // Se valida por los BYTES, no por el tipo que declara el navegador.
  const validez = validarArchivo(contenido);
  if (!validez.ok) return { ok: false, error: validez.error };

  const hash = hashArchivo(contenido);

  // Si ya subió exactamente el mismo archivo, no lo duplicamos.
  const yaExiste = await db.documento.findFirst({
    where: { tramiteId: tramite.id, hash, estado: { not: "rechazado" } },
  });
  if (yaExiste) {
    return { ok: true, mensaje: "Ese archivo ya lo habías subido." };
  }

  const nombreArchivo = nombrarConConvencion(
    tramite.catalogo.numero,
    null,
    tramite.catalogo.nombre,
    invitacion.propiedad.nombre,
    validez.extension
  );

  const ruta = await guardar(
    carpetaDe(invitacion.propiedadId, "documentos"),
    nombreArchivo,
    contenido,
    validez.tipo
  );

  // Vigencia: se calcula desde hoy porque el invitado no captura la fecha del
  // documento. Al revisarlo, el admin puede corregir la fecha real.
  let vigenciaHasta: Date | null = null;
  if (tramite.catalogo.vigenciaDias) {
    vigenciaHasta = new Date();
    vigenciaHasta.setDate(vigenciaHasta.getDate() + tramite.catalogo.vigenciaDias);
  }

  const documento = await db.documento.create({
    data: {
      propiedadId: invitacion.propiedadId,
      tramiteId: tramite.id,
      nombreOriginal: archivo.name,
      nombreArchivo,
      ruta,
      mimeType: validez.tipo,
      tamanoBytes: archivo.size,
      hash,
      estado: "pendiente",
      vigenciaHasta,
      subidoPorTipo: "invitado",
      subidoPorInvitacionId: invitacion.id,
    },
  });

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
    entidadId: documento.id,
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
