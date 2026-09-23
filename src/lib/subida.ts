import { db } from "./db";
import { hashArchivo } from "./cripto";
import {
  guardar,
  leer,
  eliminar,
  carpetaDe,
  validarArchivo,
  nombrarConConvencion,
  esRutaEntrante,
} from "./almacen";

// Lo que comparten las dos formas de subir un documento al expediente: la del
// comprador desde su link y la tuya desde la propiedad. Los PERMISOS no viven
// aquí: cada acción valida primero quién sube y a qué trámite, y solo después
// llama a estas funciones.

export type ArchivoRecibido =
  | { ok: true; contenido: Buffer; nombreOriginal: string }
  | { ok: false; error: string };

/**
 * Saca el archivo del formulario. Llega de una de dos formas:
 *   · adjunto en el formulario (en tu computadora, sin límite de tamaño), o
 *   · ya subido a la sala de espera de Supabase (publicada), con su ruta.
 * En el segundo caso se lee y se BORRA de la sala de espera pase lo que pase:
 * si el archivo resulta inválido, no se queda ahí ocupando espacio.
 */
export async function recibirArchivo(formData: FormData): Promise<ArchivoRecibido> {
  const entrante = formData.get("rutaEntrante");

  if (typeof entrante === "string" && entrante !== "") {
    // Solo rutas de la sala de espera: sin esto, alguien podría pedir que la
    // app "recibiera" el documento de otra persona pasando su ruta.
    if (!esRutaEntrante(entrante)) {
      return { ok: false, error: "La subida no es válida. Inténtalo otra vez." };
    }
    try {
      const contenido = await leer(entrante);
      const nombre = String(formData.get("nombreOriginal") ?? "").trim().slice(0, 200);
      return { ok: true, contenido, nombreOriginal: nombre || "archivo" };
    } catch {
      return { ok: false, error: "No llegó el archivo. Inténtalo otra vez." };
    } finally {
      await eliminar(entrante).catch(() => {});
    }
  }

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "No llegó ningún archivo. Inténtalo otra vez." };
  }
  return {
    ok: true,
    contenido: Buffer.from(await archivo.arrayBuffer()),
    nombreOriginal: archivo.name,
  };
}

export type ResultadoGuardado =
  | { ok: true; documentoId: string; duplicado: false; nombreArchivo: string }
  | { ok: true; documentoId: string; duplicado: true }
  | { ok: false; error: string };

/**
 * Valida el archivo por sus bytes, lo nombra con tu convención
 * ("8 - INE Comprador Turmalina.jpg"), lo guarda y crea el Documento.
 * Si ese mismo archivo ya estaba en el trámite, no lo duplica.
 */
export async function guardarDocumento(opciones: {
  propiedad: { id: string; nombre: string };
  tramite: {
    id: string;
    catalogo: { numero: number; nombre: string; vigenciaDias: number | null };
  };
  /** "a" documento, "b" orden de cobro, "c" pago — solo en municipales. */
  subTipo: string | null;
  contenido: Buffer;
  nombreOriginal: string;
  estado: "pendiente" | "aprobado";
  subidoPor: { tipo: "invitado"; invitacionId: string } | { tipo: "admin"; usuarioId: string };
  /** Bytes permitidos. Por defecto 20 MB; Erick sube hasta 50 (escrituras). */
  maximo?: number;
}): Promise<ResultadoGuardado> {
  const { propiedad, tramite, contenido } = opciones;

  // Se valida por los BYTES, no por el tipo que declara el navegador.
  const validez = validarArchivo(contenido, { maximo: opciones.maximo });
  if (!validez.ok) return { ok: false, error: validez.error };

  const hash = hashArchivo(contenido);

  const yaExiste = await db.documento.findFirst({
    where: { tramiteId: tramite.id, hash, estado: { not: "rechazado" } },
    select: { id: true },
  });
  if (yaExiste) return { ok: true, documentoId: yaExiste.id, duplicado: true };

  const nombreArchivo = nombrarConConvencion(
    tramite.catalogo.numero,
    opciones.subTipo,
    tramite.catalogo.nombre,
    propiedad.nombre,
    validez.extension
  );

  const ruta = await guardar(
    carpetaDe(propiedad.id, "documentos"),
    nombreArchivo,
    contenido,
    validez.tipo
  );

  // Vigencia desde hoy: al subir nadie captura la fecha del documento. En
  // Revisar se puede corregir con la fecha real.
  let vigenciaHasta: Date | null = null;
  if (tramite.catalogo.vigenciaDias) {
    vigenciaHasta = new Date();
    vigenciaHasta.setDate(vigenciaHasta.getDate() + tramite.catalogo.vigenciaDias);
  }

  const documento = await db.documento.create({
    data: {
      propiedadId: propiedad.id,
      tramiteId: tramite.id,
      subTipo: opciones.subTipo,
      nombreOriginal: opciones.nombreOriginal,
      nombreArchivo,
      ruta,
      mimeType: validez.tipo,
      tamanoBytes: contenido.length,
      hash,
      estado: opciones.estado,
      // Lo que subes tú no pasa por la bandeja de revisión: ya está revisado.
      revisadoEn: opciones.estado === "aprobado" ? new Date() : null,
      vigenciaHasta,
      subidoPorTipo: opciones.subidoPor.tipo,
      subidoPorInvitacionId:
        opciones.subidoPor.tipo === "invitado" ? opciones.subidoPor.invitacionId : null,
      subidoPorUsuarioId:
        opciones.subidoPor.tipo === "admin" ? opciones.subidoPor.usuarioId : null,
    },
  });

  return { ok: true, documentoId: documento.id, duplicado: false, nombreArchivo };
}
