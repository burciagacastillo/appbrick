import { z } from "zod";
import {
  CATEGORIAS_GASTO,
  METODOS_PAGO,
  ETAPAS,
  TIPOS_PROPIEDAD,
  ESTADOS_TRAMITE,
  ESTADOS_CIVILES,
  REGIMENES,
} from "./constants";

// Validación de todo lo que entra por formulario.
//
// POR QUÉ: los Server Actions son endpoints públicos. El `required` del HTML
// no protege nada — cualquiera con sesión puede mandar un FormData armado a
// mano. Antes cada acción hacía String(formData.get("x")) y confiaba.

/** Convierte los ids de un catálogo de constants.ts en un enum de Zod. */
function enumDe<T extends readonly { id: string }[]>(catalogo: T) {
  const ids = catalogo.map((c) => c.id) as [string, ...string[]];
  return z.enum(ids);
}

// --- Piezas reutilizables ---------------------------------------------------

const id = z.string().min(1).max(64);
const textoCorto = z.string().trim().max(200);
const textoLargo = z.string().trim().max(4000);

/** Campo de texto opcional: "" se guarda como null, no como cadena vacía. */
const opcional = textoCorto.optional().transform((v) => v || null);
const opcionalLargo = textoLargo.optional().transform((v) => v || null);

/** Dinero en pesos. El tope evita que un dedazo meta un número absurdo. */
const dinero = z.coerce.number().finite().min(0).max(999_999_999);
const dineroOpcional = z
  .union([z.literal(""), dinero])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : Number(v)));

const enteroOpcional = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(100)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : Number(v)));

const fechaOpcional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? new Date(`${v}T12:00:00`) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Fecha inválida");

/** Checkbox de HTML: llega "on" o no llega. */
const interruptor = z
  .union([z.literal("on"), z.undefined(), z.string()])
  .transform((v) => v === "on");

// --- Esquemas por acción ----------------------------------------------------

/**
 * Login. A propósito NO valida el formato del correo.
 *
 * Aquí el correo es solo una llave de búsqueda; quien autoriza es la
 * contraseña. Exigir formato público (dominio con punto y TLD) dejaría fuera
 * cuentas internas perfectamente válidas como "maria@brick.local", y además
 * con un mensaje que no ayuda. El formato se valida al dar de alta la cuenta.
 */
export const EsquemaLogin = z.object({
  email: z.string().trim().toLowerCase().min(1, "Falta el correo").max(200),
  password: z.string().min(1, "Falta la contraseña").max(200),
});

export const EsquemaCodigo = z.object({
  codigo: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "El código son 6 números")),
});

export const EsquemaGasto = z.object({
  propiedadId: id,
  fecha: fechaOpcional,
  descripcion: textoCorto.min(1, "Falta la descripción del gasto"),
  categoria: enumDe(CATEGORIAS_GASTO),
  metodo: enumDe(METODOS_PAGO),
  monto: dinero.refine((n) => n > 0, "El monto debe ser mayor a cero"),
  pagadoPor: opcional,
});

export const EsquemaEstadoTramite = z.object({
  tramiteId: id,
  estado: enumDe(ESTADOS_TRAMITE),
});

export const EsquemaSubdoc = z.object({
  tramiteId: id,
  campo: z.enum(["docRecibido", "ordenDeCobro", "pagoComprobado"]),
});

export const EsquemaDetalleTramite = z.object({
  tramiteId: id,
  responsable: opcional,
  fechaLimite: fechaOpcional,
  costo: dineroOpcional,
  notas: opcionalLargo,
});

export const EsquemaPropiedad = z.object({
  propiedadId: id,
  nombre: textoCorto.min(1, "La propiedad necesita nombre"),
  direccion: opcional,
  colonia: opcional,
  etapa: enumDe(ETAPAS),
  tipo: enumDe(TIPOS_PROPIEDAD),
  valorCompra: dineroOpcional,
  valorVentaEstimado: dineroOpcional,
  valorVentaReal: dineroOpcional,
  presupuestoObra: dineroOpcional,
  fechaCierreObjetivo: fechaOpcional,
  carpetaDrive: opcional,
  notas: opcionalLargo,
});

export const EsquemaRechazo = z.object({
  documentoId: id,
  motivo: textoCorto
    .min(1, "Hay que decir por qué se rechaza: el comprador lo va a leer"),
});

export const EsquemaDocumentoId = z.object({ documentoId: id });

export const EsquemaFechaDocumento = z.object({
  documentoId: id,
  fechaDocumento: fechaOpcional,
});

export const EsquemaInvitar = z.object({
  propiedadId: id,
  rol: z.enum(["comprador", "vendedor"]),
  nombre: textoCorto.min(1, "Falta el nombre de la persona"),
  telefono: opcional,
  personaId: z.string().max(64).optional(),
});

export const EsquemaAccesoAyudante = z.object({
  usuarioId: id,
  propiedadId: id,
  // Tope de 2 años: un acceso "temporal" de 99 años no es temporal.
  dias: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(730)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
});

export const EsquemaFichaPublica = z.object({
  propiedadId: id,
  publicada: interruptor,
  destacada: interruptor,
  mostrarPrecio: interruptor,
  aceptaInfonavit: interruptor,
  aceptaBancario: interruptor,
  tituloPublico: opcional,
  descripcionPublica: opcionalLargo,
  precioPublico: dineroOpcional,
  recamaras: enteroOpcional,
  banos: enteroOpcional,
  m2Terreno: dineroOpcional,
  m2Construccion: dineroOpcional,
  cochera: enteroOpcional,
});

export const EsquemaSubidaInvitado = z.object({
  token: z.string().min(20).max(200),
  tramiteId: id,
});

// --- Utilidad ---------------------------------------------------------------

export type Fallo = { error: string };

/**
 * Valida un FormData contra un esquema. Devuelve los datos ya tipados o el
 * primer mensaje de error, listo para enseñárselo al usuario.
 */
export function validar<T extends z.ZodType>(
  esquema: T,
  formData: FormData
): { ok: true; datos: z.infer<T> } | { ok: false; error: string } {
  const crudo = Object.fromEntries(formData);
  const r = esquema.safeParse(crudo);

  if (r.success) return { ok: true, datos: r.data };

  const primero = r.error.issues[0];
  return {
    ok: false,
    error: primero?.message ?? "Los datos del formulario no son válidos.",
  };
}

/**
 * Igual que validar(), pero lanza. Para acciones cuyo formulario no muestra
 * errores: si algo llega mal es que alguien manipuló la petición, y ahí sí
 * queremos que truene ruidosamente en vez de guardar basura.
 */
export function validarOTronar<T extends z.ZodType>(
  esquema: T,
  formData: FormData
): z.infer<T> {
  const r = validar(esquema, formData);
  if (!r.ok) throw new Error(r.error);
  return r.datos;
}

// --- Personas ---------------------------------------------------------------

export const EsquemaPersona = z.object({
  personaId: id,
  propiedadId: id,
  nombre: textoCorto.min(1, "La persona necesita nombre"),
  telefono: opcional,
  email: opcional,
  curp: opcional,
  rfc: opcional,
  nss: opcional,
  domicilio: opcionalLargo,

  estadoCivil: z
    .union([z.literal(""), z.enum(ESTADOS_CIVILES.map((e) => e.id) as [string, ...string[]])])
    .optional()
    .transform((v) => v || null),
  regimenMatrimonial: z
    .union([z.literal(""), z.enum(REGIMENES.map((r) => r.id) as [string, ...string[]])])
    .optional()
    .transform((v) => v || null),
  conyugeNombre: opcional,

  empleador: opcional,
  puesto: opcional,
  antiguedadMeses: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(720)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
  ingresoMensual: dineroOpcional,

  numeroCredito: opcional,
  infonavitUsuario: opcional,
  /**
   * La contraseña nueva. Si llega vacía se conserva la que ya estaba: así
   * guardar cualquier otro campo no la borra sin querer.
   */
  infonavitPassword: z.string().max(200).optional(),
  notas: opcionalLargo,
});

export const EsquemaReferencias = z.object({
  personaId: id,
  propiedadId: id,
  nombre1: opcional,
  telefono1: opcional,
  parentesco1: opcional,
  nombre2: opcional,
  telefono2: opcional,
  parentesco2: opcional,
});

export const EsquemaVincular = z.object({
  propiedadId: id,
  nombre: textoCorto.min(1, "Falta el nombre"),
  telefono: opcional,
  rol: z.enum(["vendedor", "comprador", "socio", "contratista", "notario", "valuador", "otro"]),
});

export const EsquemaRevelar = z.object({
  personaId: id,
});

export const EsquemaOperacion = z.object({
  propiedadId: id,
  notaria: opcional,
  fechaFirmaProgramada: fechaOpcional,
  saldoCreditoVendedor: dineroOpcional,
  montoCreditoComprador: dineroOpcional,
  enganche: dineroOpcional,
});
