"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";
import {
  validar,
  validarOTronar,
  EsquemaDocumentoId,
  EsquemaRechazo,
  EsquemaFechaDocumento,
} from "@/lib/esquemas";

// Revisión de documentos. Solo admin: aprobar o rechazar decide si un
// expediente avanza, y el ayudante no toma esa decisión.

function refrescarRevision(propiedadId: string) {
  revalidatePath("/revisar");
  revalidatePath("/recordatorios");
  revalidatePath(`/propiedades/${propiedadId}`);
  revalidatePath("/");
}

/**
 * Aprueba un documento. Si con esto el trámite ya tiene lo que necesita,
 * se marca completo solo — que es el 90% de los casos.
 */
export async function aprobarDocumento(formData: FormData) {
  const usuario = await exigirAdmin();
  const { documentoId } = validarOTronar(EsquemaDocumentoId, formData);

  const documento = await db.documento.update({
    where: { id: documentoId },
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

  refrescarRevision(documento.propiedadId);
  // El portal del invitado también cambia: deja de pedirle ese documento.
  revalidatePath("/subir", "layout");
}

export type ResultadoRechazo = { ok: true } | { ok: false; error: string };

/**
 * Rechaza con motivo. El motivo NO es opcional: es lo que el comprador va a
 * leer en su portal, y "rechazado" a secas lo deja sin saber qué hacer.
 */
export async function rechazarDocumento(
  _previo: ResultadoRechazo | null,
  formData: FormData
): Promise<ResultadoRechazo> {
  const usuario = await exigirAdmin();

  const v = validar(EsquemaRechazo, formData);
  if (!v.ok) return { ok: false, error: v.error };

  const documento = await db.documento.update({
    where: { id: v.datos.documentoId },
    data: {
      estado: "rechazado",
      motivoRechazo: v.datos.motivo,
      revisadoEn: new Date(),
    },
    include: { tramite: true, propiedad: { select: { nombre: true } } },
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
    detalle: `${documento.nombreArchivo} — ${documento.propiedad.nombre} · ${v.datos.motivo}`,
  });

  refrescarRevision(documento.propiedadId);
  revalidatePath("/subir", "layout");
  return { ok: true };
}

/** Corrige la fecha real del documento y recalcula su vigencia. */
export async function corregirFecha(formData: FormData) {
  const usuario = await exigirAdmin();
  const d = validarOTronar(EsquemaFechaDocumento, formData);

  const documento = await db.documento.findUnique({
    where: { id: d.documentoId },
    include: { tramite: { include: { catalogo: true } } },
  });
  if (!documento) return;

  let vigenciaHasta: Date | null = null;
  const dias = documento.tramite?.catalogo.vigenciaDias;
  if (d.fechaDocumento && dias) {
    vigenciaHasta = new Date(d.fechaDocumento);
    vigenciaHasta.setDate(vigenciaHasta.getDate() + dias);
  }

  await db.documento.update({
    where: { id: d.documentoId },
    data: { fechaDocumento: d.fechaDocumento, vigenciaHasta },
  });

  // Se registra igual que las demás: cambiar esta fecha mueve la vigencia,
  // y de la vigencia depende que Infonavit acepte o rebote el documento.
  await registrar({
    tipoActor: "admin",
    actor: usuario.nombre,
    accion: "corrigio_fecha",
    entidad: "documento",
    entidadId: documento.id,
    detalle: vigenciaHasta
      ? `${documento.nombreArchivo} · vigente hasta ${vigenciaHasta.toLocaleDateString("es-MX")}`
      : documento.nombreArchivo,
  });

  refrescarRevision(documento.propiedadId);
}
