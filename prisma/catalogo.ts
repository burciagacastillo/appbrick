// Catálogo maestro del expediente Infonavit — los 34 documentos en 8 bloques.
// Confirmado por Erick el 22 de septiembre de 2026: manda esta numeración
// (1 = Poder, 2 = INE), la que ya usan los archivos de sus carpetas.
//
// requierePago  → tiene el ciclo a/b/c: a documento, b orden de cobro, c pago.
// esDato        → no es un archivo; se captura en campos (NSS, referencias).
// loSubeInvitado→ el comprador o el vendedor lo sube desde su link.
// vigenciaDias  → cuántos días sigue sirviendo para el trámite. Null = no caduca.

export type ItemCatalogo = {
  numero: number;
  bloque: string;
  bloqueNombre: string;
  nombre: string;
  requierePago?: boolean;
  opcional?: boolean;
  esDato?: boolean;
  loSubeInvitado?: boolean;
  vigenciaDias?: number;
  dondeSeTramita?: string;
  notasAyuda?: string;
  /// Cómo explicárselo a alguien que nunca ha tramitado un crédito.
  ayudaInvitado?: string;
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
  {
    numero: 1, bloque: "A", bloqueNombre: A, nombre: "Poder",
    dondeSeTramita: "Notaría",
    notasAyuda: "Guardar copia también en la carpeta Poderes.",
  },
  {
    numero: 2, bloque: "A", bloqueNombre: A, nombre: "INE", loSubeInvitado: true,
    ayudaInvitado: "Tu credencial de elector, por los dos lados. Puedes tomarle foto.",
  },
  {
    numero: 3, bloque: "A", bloqueNombre: A, nombre: "CURP", loSubeInvitado: true,
    ayudaInvitado: "La descargas gratis en gob.mx/curp.",
  },
  {
    numero: 4, bloque: "A", bloqueNombre: A, nombre: "RFC / situación fiscal",
    loSubeInvitado: true, dondeSeTramita: "SAT",
    ayudaInvitado: "Es la Constancia de Situación Fiscal. Se saca en el portal del SAT.",
  },
  {
    numero: 5, bloque: "A", bloqueNombre: A, nombre: "Acta de nacimiento",
    loSubeInvitado: true,
    ayudaInvitado: "Sirve la copia certificada o la que descargas en gob.mx.",
  },
  {
    numero: 6, bloque: "A", bloqueNombre: A, nombre: "Acta de matrimonio",
    opcional: true, loSubeInvitado: true,
    notasAyuda: "Solo si el vendedor es casado por bienes mancomunados.",
    ayudaInvitado: "Solo si eres casado. Si eres soltero, sáltalo.",
  },
  {
    numero: 7, bloque: "A", bloqueNombre: A, nombre: "Estado de cuenta bancaria",
    loSubeInvitado: true, vigenciaDias: 90,
    notasAyuda: "Es a dónde se le deposita al vendedor.",
    ayudaInvitado: "Una carátula reciente donde se vea tu nombre y tu CLABE.",
  },

  // --- Bloque B — Comprador / Derechohabiente (8-15) ------------------------
  {
    numero: 8, bloque: "B", bloqueNombre: B, nombre: "INE / identificación oficial",
    loSubeInvitado: true,
    ayudaInvitado: "Tu credencial de elector, por los dos lados. Puedes tomarle foto.",
  },
  {
    numero: 9, bloque: "B", bloqueNombre: B, nombre: "CURP", loSubeInvitado: true,
    ayudaInvitado: "La descargas gratis en gob.mx/curp.",
  },
  {
    numero: 10, bloque: "B", bloqueNombre: B, nombre: "RFC / situación fiscal",
    loSubeInvitado: true, dondeSeTramita: "SAT",
    ayudaInvitado: "Es la Constancia de Situación Fiscal. Se saca en el portal del SAT.",
  },
  {
    numero: 11, bloque: "B", bloqueNombre: B, nombre: "Acta de nacimiento",
    loSubeInvitado: true,
    ayudaInvitado: "Sirve la copia certificada o la que descargas en gob.mx.",
  },
  {
    numero: 12, bloque: "B", bloqueNombre: B, nombre: "INE validada (portal INE)",
    loSubeInvitado: true, dondeSeTramita: "Portal INE",
    ayudaInvitado: "Es el comprobante de que tu INE se validó en el portal del INE.",
  },
  {
    numero: 13, bloque: "B", bloqueNombre: B, nombre: "NSS y contraseña Infonavit",
    esDato: true,
    notasAyuda: "Sin esto no se puede mover nada del crédito.",
  },
  {
    numero: 14, bloque: "B", bloqueNombre: B, nombre: "Formato SIC (firmado)",
    loSubeInvitado: true,
    ayudaInvitado: "El formato que te pasamos, ya firmado. Súbelo escaneado o en foto.",
  },
  {
    numero: 15, bloque: "B", bloqueNombre: B, nombre: "Simulador de ecotecnologías (firmado)",
    loSubeInvitado: true,
    ayudaInvitado: "El simulador que te pasamos, ya firmado.",
  },

  // --- Bloque C — Solicitudes y referencias (16-19) -------------------------
  {
    numero: 16, bloque: "C", bloqueNombre: C, nombre: "Solicitud de avalúo (firmada)",
    notasAyuda: "Es el formato ATSA.",
  },
  {
    numero: 17, bloque: "C", bloqueNombre: C, nombre: "Solicitud de Inscripción de Crédito (firmada)",
  },
  {
    numero: 18, bloque: "C", bloqueNombre: C, nombre: "Referencia 1 (nombre y teléfono)",
    esDato: true,
  },
  {
    numero: 19, bloque: "C", bloqueNombre: C, nombre: "Referencia 2 (nombre y teléfono)",
    esDato: true,
  },

  // --- Bloque D — Trámites municipales (20-24) ------------------------------
  // Los tramitas tú, no el comprador. Todos con ciclo a/b/c.
  {
    numero: 20, bloque: "D", bloqueNombre: D, nombre: "Número oficial",
    requierePago: true, dondeSeTramita: "Desarrollo Urbano Municipal",
  },
  {
    numero: 21, bloque: "D", bloqueNombre: D, nombre: "Constancia de zonificación",
    requierePago: true, dondeSeTramita: "Desarrollo Urbano Municipal",
  },
  {
    numero: 22, bloque: "D", bloqueNombre: D, nombre: "No adeudo de pavimento",
    requierePago: true, dondeSeTramita: "Municipio",
  },
  {
    numero: 23, bloque: "D", bloqueNombre: D, nombre: "Cédula catastral",
    requierePago: true, dondeSeTramita: "Catastro Municipal",
  },
  {
    numero: 24, bloque: "D", bloqueNombre: D, nombre: "Certificado de libertad de gravamen",
    requierePago: true, dondeSeTramita: "Registro Público de la Propiedad",
    vigenciaDias: 90,
  },

  // --- Bloque E — Recibos (25-27) -------------------------------------------
  // Los que caducan. La app avisa antes de que Infonavit los rebote.
  {
    numero: 25, bloque: "E", bloqueNombre: E, nombre: "Recibo de agua",
    dondeSeTramita: "JMAS", vigenciaDias: 90,
  },
  {
    numero: 26, bloque: "E", bloqueNombre: E, nombre: "Recibo de luz",
    dondeSeTramita: "CFE", vigenciaDias: 90,
  },
  {
    numero: 27, bloque: "E", bloqueNombre: E, nombre: "Recibo de predial",
    dondeSeTramita: "Catastro Municipal", vigenciaDias: 365,
  },

  // --- Bloque F — Inmueble: legal y valor (28-30) ---------------------------
  { numero: 28, bloque: "F", bloqueNombre: F, nombre: "Avalúo / valor catastral predial" },
  {
    numero: 29, bloque: "F", bloqueNombre: F, nombre: "Plano catastral",
    dondeSeTramita: "Catastro Municipal",
  },
  {
    numero: 30, bloque: "F", bloqueNombre: F, nombre: "Escritura digitalizada",
    notasAyuda: "Guardar escritura completa y carátula por separado.",
  },

  // --- Bloque G — Avalúo y crédito (31-33) ----------------------------------
  {
    numero: 31, bloque: "G", bloqueNombre: G, nombre: "Avalúo / dictamen técnico",
    dondeSeTramita: "Valuador (Poncho)", vigenciaDias: 180,
  },
  {
    numero: 32, bloque: "G", bloqueNombre: G, nombre: "Precalificación y puntos",
    notasAyuda: "La 'preca' del derechohabiente.",
  },
  {
    numero: 33, bloque: "G", bloqueNombre: G, nombre: "Saber para Decidir / Saber Más",
    loSubeInvitado: true,
    notasAyuda: "Constancia del curso. Si son dos compradores, se necesita de ambos.",
    ayudaInvitado: "La constancia del curso en línea de Infonavit.",
  },

  // --- Bloque H — Trámites (34) ---------------------------------------------
  { numero: 34, bloque: "H", bloqueNombre: H, nombre: "Bonificación" },
];

/** Lo que le toca subir al vendedor desde su link. */
export const NUMEROS_VENDEDOR = CATALOGO.filter(
  (c) => c.bloque === "A" && c.loSubeInvitado
).map((c) => c.numero);

/** Lo que le toca subir al comprador desde su link. */
export const NUMEROS_COMPRADOR = CATALOGO.filter(
  (c) => c.bloque === "B" && c.loSubeInvitado
).map((c) => c.numero);
