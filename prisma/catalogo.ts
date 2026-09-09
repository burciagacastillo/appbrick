// Catálogo maestro del expediente Infonavit — los 34 documentos en 8 bloques.
// Sacado de tu "Checklist Infonavit - Sierra la Escondida.docx" y de la
// numeración con la que ya nombras los archivos en las carpetas.
//
// requierePago = true → el trámite tiene el ciclo a/b/c que ya usas:
//   a = el documento    b = orden de cobro    c = comprobante de pago

export type ItemCatalogo = {
  numero: number;
  bloque: string;
  bloqueNombre: string;
  nombre: string;
  requierePago?: boolean;
  opcional?: boolean;
  dondeSeTramita?: string;
  notasAyuda?: string;
};

const A = "Vendedor";
const B = "Comprador / Derechohabiente";
const C = "Solicitudes y referencias";
const D = "Trámites municipales del inmueble";
const E = "Recibos";
const F = "Inmueble: legal y valor";
const G = "Avalúo y crédito";
const H = "Trámites";

export const CATALOGO: ItemCatalogo[] = [
  // --- Bloque A — Vendedor (1-7) --------------------------------------------
  { numero: 1, bloque: "A", bloqueNombre: A, nombre: "Poder", dondeSeTramita: "Notaría", notasAyuda: "Guardar copia también en la carpeta Poderes." },
  { numero: 2, bloque: "A", bloqueNombre: A, nombre: "INE" },
  { numero: 3, bloque: "A", bloqueNombre: A, nombre: "CURP" },
  { numero: 4, bloque: "A", bloqueNombre: A, nombre: "RFC / situación fiscal", dondeSeTramita: "SAT" },
  { numero: 5, bloque: "A", bloqueNombre: A, nombre: "Acta de nacimiento" },
  { numero: 6, bloque: "A", bloqueNombre: A, nombre: "Acta de matrimonio", opcional: true, notasAyuda: "Solo si el vendedor es casado por bienes mancomunados." },
  { numero: 7, bloque: "A", bloqueNombre: A, nombre: "Estado de cuenta bancaria", notasAyuda: "Es a dónde se le deposita al vendedor." },

  // --- Bloque B — Comprador / Derechohabiente (8-15) ------------------------
  { numero: 8, bloque: "B", bloqueNombre: B, nombre: "INE / identificación oficial" },
  { numero: 9, bloque: "B", bloqueNombre: B, nombre: "CURP" },
  { numero: 10, bloque: "B", bloqueNombre: B, nombre: "RFC / situación fiscal", dondeSeTramita: "SAT" },
  { numero: 11, bloque: "B", bloqueNombre: B, nombre: "Acta de nacimiento" },
  { numero: 12, bloque: "B", bloqueNombre: B, nombre: "INE validada (portal INE)", dondeSeTramita: "Portal INE" },
  { numero: 13, bloque: "B", bloqueNombre: B, nombre: "NSS y contraseña Infonavit", notasAyuda: "Sin esto no se puede mover nada del crédito." },
  { numero: 14, bloque: "B", bloqueNombre: B, nombre: "Formato SIC (firmado)" },
  { numero: 15, bloque: "B", bloqueNombre: B, nombre: "Simulador de ecotecnologías (firmado)" },

  // --- Bloque C — Solicitudes y referencias (16-19) -------------------------
  { numero: 16, bloque: "C", bloqueNombre: C, nombre: "Solicitud de avalúo (firmada)", notasAyuda: "Es el formato ATSA." },
  { numero: 17, bloque: "C", bloqueNombre: C, nombre: "Solicitud de Inscripción de Crédito (firmada)" },
  { numero: 18, bloque: "C", bloqueNombre: C, nombre: "Referencia 1 (nombre y teléfono)" },
  { numero: 19, bloque: "C", bloqueNombre: C, nombre: "Referencia 2 (nombre y teléfono)" },

  // --- Bloque D — Trámites municipales (20-24) ------------------------------
  // Todos con ciclo a/b/c: documento, orden de cobro y comprobante de pago.
  { numero: 20, bloque: "D", bloqueNombre: D, nombre: "Número oficial", requierePago: true, dondeSeTramita: "Desarrollo Urbano Municipal" },
  { numero: 21, bloque: "D", bloqueNombre: D, nombre: "Constancia de zonificación", requierePago: true, dondeSeTramita: "Desarrollo Urbano Municipal" },
  { numero: 22, bloque: "D", bloqueNombre: D, nombre: "No adeudo de pavimento", requierePago: true, dondeSeTramita: "Municipio" },
  { numero: 23, bloque: "D", bloqueNombre: D, nombre: "Cédula catastral", requierePago: true, dondeSeTramita: "Catastro Municipal" },
  { numero: 24, bloque: "D", bloqueNombre: D, nombre: "Certificado de libertad de gravamen", requierePago: true, dondeSeTramita: "Registro Público de la Propiedad" },

  // --- Bloque E — Recibos (25-27) -------------------------------------------
  { numero: 25, bloque: "E", bloqueNombre: E, nombre: "Recibo de agua", dondeSeTramita: "JMAS" },
  { numero: 26, bloque: "E", bloqueNombre: E, nombre: "Recibo de luz", dondeSeTramita: "CFE" },
  { numero: 27, bloque: "E", bloqueNombre: E, nombre: "Recibo de predial", dondeSeTramita: "Catastro Municipal" },

  // --- Bloque F — Inmueble: legal y valor (28-30) ---------------------------
  { numero: 28, bloque: "F", bloqueNombre: F, nombre: "Avalúo / valor catastral predial" },
  { numero: 29, bloque: "F", bloqueNombre: F, nombre: "Plano catastral", dondeSeTramita: "Catastro Municipal" },
  { numero: 30, bloque: "F", bloqueNombre: F, nombre: "Escritura digitalizada", notasAyuda: "Guardar escritura completa y carátula por separado." },

  // --- Bloque G — Avalúo y crédito (31-33) ----------------------------------
  { numero: 31, bloque: "G", bloqueNombre: G, nombre: "Avalúo / dictamen técnico", dondeSeTramita: "Valuador (Poncho)" },
  { numero: 32, bloque: "G", bloqueNombre: G, nombre: "Precalificación y puntos", notasAyuda: "La 'preca' del derechohabiente." },
  { numero: 33, bloque: "G", bloqueNombre: G, nombre: "Saber para Decidir / Saber Más", notasAyuda: "Constancia del curso. Si son dos compradores, se necesita de ambos." },

  // --- Bloque H — Trámites (34) ---------------------------------------------
  { numero: 34, bloque: "H", bloqueNombre: H, nombre: "Bonificación" },
];

/** Los números del catálogo que aplican al vendedor (bloque A). */
export const NUMEROS_VENDEDOR = CATALOGO.filter((c) => c.bloque === "A").map((c) => c.numero);
/** Los que aplican al comprador (bloque B). */
export const NUMEROS_COMPRADOR = CATALOGO.filter((c) => c.bloque === "B").map((c) => c.numero);
