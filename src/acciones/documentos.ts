"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";
import { prepararSubidaDirecta, TAMANO_MAXIMO_ADMIN } from "@/lib/almacen";
import { recibirArchivo, guardarDocumento } from "@/lib/subida";
import {
  validar,
  validarOTronar,
  EsquemaDocumentoId,
  EsquemaRechazo,
  EsquemaFechaDocumento,
  EsquemaSubidaAdmin,
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

// ---------------------------------------------------------------------------
// Subida desde el expediente (admin)
// ---------------------------------------------------------------------------

export type ResultadoSubidaAdmin = { ok: true; mensaje: string } | { ok: false; error: string };
export type PermisoSubidaAdmin = { ruta: string; url: string } | null | { error: string };

/** Paso 1 (solo publicada): permiso para mandar el archivo directo a Supabase. */
export async function prepararSubidaAdmin(): Promise<PermisoSubidaAdmin> {
  await exigirAdmin();
  return prepararSubidaDirecta();
}

/**
 * Paso 2: tu propio documento, subido desde la propiedad. Entra ya aprobado
 * (no tiene caso que te revises a ti mismo) y marca el trámite como avanzado:
 * el documento, la orden de cobro o el pago, según lo que subiste.
 */
export async function subirDocumentoAdmin(
  _previo: ResultadoSubidaAdmin | null,
  formData: FormData
): Promise<ResultadoSubidaAdmin> {
  const usuario = await exigirAdmin();

  const v = validar(EsquemaSubidaAdmin, formData);
  if (!v.ok) {
    await recibirArchivo(formData); // limpia la sala de espera
    return { ok: false, error: v.error };
  }

  const tramite = await db.tramite.findUnique({
    where: { id: v.datos.tramiteId },
    include: { catalogo: true, propiedad: { select: { id: true, nombre: true } } },
  });
  if (!tramite || tramite.catalogo.esDato) {
    await recibirArchivo(formData);
    return {
      ok: false,
      error: tramite ? "Este trámite no lleva archivo: se captura en Personas." : "Ese trámite no existe.",
    };
  }

  // El a/b/c solo tiene sentido en los municipales (los que llevan pago).
  const subTipo = tramite.catalogo.requierePago ? (v.datos.subTipo ?? "a") : null;

  const archivo = await recibirArchivo(formData);
  if (!archivo.ok) return archivo;

  const guardado = await guardarDocumento({
    propiedad: tramite.propiedad,
    tramite,
    subTipo,
    contenido: archivo.contenido,
    nombreOriginal: archivo.nombreOriginal,
    estado: "aprobado",
    subidoPor: { tipo: "admin", usuarioId: usuario.id },
    maximo: TAMANO_MAXIMO_ADMIN,
  });
  if (!guardado.ok) return guardado;
  if (guardado.duplicado) return { ok: true, mensaje: "Ese archivo ya estaba en este trámite." };

  const marca =
    subTipo === "b"
      ? { ordenDeCobro: true }
      : subTipo === "c"
        ? { pagoComprobado: true }
        : { docRecibido: true };
  const despues = { ...tramite, ...marca };
  // En los municipales hace falta el documento Y el pago; en los demás basta
  // el documento. "No aplica" es tu decisión y no se pisa.
  const cierra = tramite.catalogo.requierePago
    ? despues.docRecibido && despues.pagoComprobado
    : true;

  await db.tramite.update({
    where: { id: tramite.id },
    data: {
      ...marca,
      ...(cierra && tramite.estado !== "no_aplica" && tramite.estado !== "completo"
        ? { estado: "completo", fechaHecho: new Date() }
        : {}),
      actualizadoPorId: usuario.id,
    },
  });

  await registrar({
    tipoActor: "admin",
    actor: usuario.nombre,
    accion: "subio",
    entidad: "documento",
    entidadId: guardado.documentoId,
    detalle: `${guardado.nombreArchivo} — ${tramite.propiedad.nombre}`,
  });

  refrescarRevision(tramite.propiedadId);
  revalidatePath("/propiedades");
  return { ok: true, mensaje: "Listo, quedó guardado." };
}
