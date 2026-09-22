"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";

// Revisión de documentos. Solo admin: aprobar o rechazar decide si un
// expediente avanza, y el ayudante no toma esa decisión.

/**
 * Aprueba un documento. Si con esto el trámite ya tiene lo que necesita,
 * se marca completo solo — que es el 90% de los casos.
 */
export async function aprobarDocumento(formData: FormData) {
  const usuario = await exigirAdmin();
  const id = String(formData.get("documentoId"));

  const documento = await db.documento.update({
    where: { id },
    data: { estado: "aprobado", motivoRechazo: null, revisadoEn: new Date() },
    include: {
      tramite: { include: { catalogo: true } },
      propiedad: { select: { nombre: true } },
    },
  });

  if (documento.tramite) {
    const cat = documento.tramite.catalogo;
    // En los municipales hace falta el documento Y el comprobante de pago;
    // en los demás basta el documento.
    const cierra = cat.requierePago
      ? documento.tramite.docRecibido && documento.tramite.pagoComprobado
      : true;

    await db.tramite.update({
      where: { id: documento.tramite.id },
      data: {
        docRecibido: true,
        ...(cierra ? { estado: "completo", fechaHecho: new Date() } : {}),
        actualizadoPorId: usuario.id,
      },
    });
  }

  await registrar({
    tipoActor: "admin",
    actor: usuario.nombre,
    accion: "aprobo",
    entidad: "documento",
    entidadId: documento.id,
    detalle: `${documento.nombreArchivo} — ${documento.propiedad.nombre}`,
  });

  revalidatePath("/", "layout");
}

/**
 * Rechaza con motivo. El motivo NO es opcional: es lo que el comprador va a
 * leer en su portal, y "rechazado" a secas lo deja sin saber qué hacer.
 */
export async function rechazarDocumento(formData: FormData) {
  const usuario = await exigirAdmin();
  const id = String(formData.get("documentoId"));
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!motivo) {
    throw new Error("Hay que decir por qué se rechaza: el comprador lo va a leer.");
  }

  const documento = await db.documento.update({
    where: { id },
    data: { estado: "rechazado", motivoRechazo: motivo, revisadoEn: new Date() },
    include: {
      tramite: true,
      propiedad: { select: { nombre: true } },
    },
  });

  // El trámite vuelve a quedar pendiente si no le queda ningún documento vivo.
  if (documento.tramite) {
    const vivos = await db.documento.count({
      where: { tramiteId: documento.tramite.id, estado: { not: "rechazado" } },
    });
    if (vivos === 0) {
      await db.tramite.update({
        where: { id: documento.tramite.id },
        data: { estado: "falta", docRecibido: false, actualizadoPorId: usuario.id },
      });
    }
  }

  await registrar({
    tipoActor: "admin",
    actor: usuario.nombre,
    accion: "rechazo",
    entidad: "documento",
    entidadId: documento.id,
    detalle: `${documento.nombreArchivo} — ${documento.propiedad.nombre} · ${motivo}`,
  });

  revalidatePath("/", "layout");
}

/** Corrige la fecha real del documento y recalcula su vigencia. */
export async function corregirFecha(formData: FormData) {
  const usuario = await exigirAdmin();
  const id = String(formData.get("documentoId"));
  const fecha = String(formData.get("fechaDocumento") ?? "").trim();

  const documento = await db.documento.findUnique({
    where: { id },
    include: { tramite: { include: { catalogo: true } } },
  });
  if (!documento) return;

  const fechaDocumento = fecha ? new Date(`${fecha}T12:00:00`) : null;

  let vigenciaHasta: Date | null = null;
  const dias = documento.tramite?.catalogo.vigenciaDias;
  if (fechaDocumento && dias) {
    vigenciaHasta = new Date(fechaDocumento);
    vigenciaHasta.setDate(vigenciaHasta.getDate() + dias);
  }

  await db.documento.update({
    where: { id },
    data: { fechaDocumento, vigenciaHasta },
  });

  void usuario;
  revalidatePath("/", "layout");
}
