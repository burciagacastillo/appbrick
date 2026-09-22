// Vocabulario del negocio. SQLite no tiene enums, así que los valores válidos
// viven aquí y TypeScript los cuida. Al pasar a Postgres se vuelven enums reales.

export const ETAPAS = [
  { id: "prospecto", label: "Prospecto", desc: "En la mira, todavía no es mía", color: "slate" },
  { id: "adquisicion", label: "En adquisición", desc: "Negociando o firmando el poder", color: "amber" },
  { id: "remodelacion", label: "En remodelación", desc: "Obra en curso", color: "orange" },
  { id: "en_venta", label: "En venta", desc: "Publicada, buscando comprador", color: "blue" },
  { id: "en_tramite", label: "En trámite", desc: "Comprador con crédito en proceso", color: "violet" },
  { id: "escriturando", label: "Escriturando", desc: "En notaría, a punto de cerrar", color: "cyan" },
  { id: "concluida", label: "Concluida", desc: "Vendida y escriturada", color: "emerald" },
  { id: "cancelada", label: "Cancelada", desc: "Se cayó la operación", color: "rose" },
] as const;

export type EtapaId = (typeof ETAPAS)[number]["id"];

export const TIPOS_PROPIEDAD = [
  { id: "casa", label: "Casa" },
  { id: "terreno", label: "Terreno" },
  { id: "departamento", label: "Departamento" },
  { id: "local", label: "Local comercial" },
] as const;

// --- Expediente -------------------------------------------------------------

export const ESTADOS_TRAMITE = [
  { id: "falta", label: "Falta", icono: "✗", color: "rose" },
  { id: "revisar", label: "Revisar", icono: "?", color: "amber" },
  { id: "completo", label: "Completo", icono: "✓", color: "emerald" },
  { id: "no_aplica", label: "No aplica", icono: "—", color: "slate" },
] as const;

export type EstadoTramiteId = (typeof ESTADOS_TRAMITE)[number]["id"];

export const BLOQUES = [
  { id: "A", nombre: "Vendedor", rango: "1-7" },
  { id: "B", nombre: "Comprador / Derechohabiente", rango: "8-15" },
  { id: "C", nombre: "Solicitudes y referencias", rango: "16-19" },
  { id: "D", nombre: "Trámites municipales del inmueble", rango: "20-24" },
  { id: "E", nombre: "Recibos", rango: "25-27" },
  { id: "F", nombre: "Inmueble: legal y valor", rango: "28-30" },
  { id: "G", nombre: "Avalúo y crédito", rango: "31-33" },
  { id: "H", nombre: "Trámites", rango: "34" },
] as const;

// --- Dinero -----------------------------------------------------------------

// Categorías tomadas de tu Gastos.xlsx, más las que faltaban para obra.
export const CATEGORIAS_GASTO = [
  { id: "terreno", label: "Terreno / adquisición", grupo: "Adquisición" },
  { id: "escrituras", label: "Escrituras y honorarios", grupo: "Adquisición" },
  { id: "poder", label: "Poder notarial", grupo: "Adquisición" },
  { id: "avaluo", label: "Avalúo", grupo: "Trámites" },
  { id: "uso_suelo", label: "Uso de suelo / zonificación", grupo: "Trámites" },
  { id: "numero_oficial", label: "Número oficial", grupo: "Trámites" },
  { id: "catastro", label: "Cédula catastral", grupo: "Trámites" },
  { id: "predial", label: "Predial", grupo: "Trámites" },
  { id: "pavimento", label: "No adeudo de pavimento", grupo: "Trámites" },
  { id: "gravamen", label: "Libertad de gravamen", grupo: "Trámites" },
  { id: "servicios", label: "Agua y luz", grupo: "Trámites" },
  { id: "mano_obra", label: "Mano de obra", grupo: "Obra" },
  { id: "material", label: "Material", grupo: "Obra" },
  { id: "acabados", label: "Acabados", grupo: "Obra" },
  { id: "limpieza", label: "Limpieza y flete", grupo: "Obra" },
  { id: "publicidad", label: "Publicidad y fotos", grupo: "Venta" },
  { id: "comision", label: "Comisiones", grupo: "Venta" },
  { id: "otro", label: "Otro", grupo: "Otro" },
] as const;

export type CategoriaGastoId = (typeof CATEGORIAS_GASTO)[number]["id"];

export const GRUPOS_GASTO = ["Adquisición", "Trámites", "Obra", "Venta", "Otro"] as const;

export const METODOS_PAGO = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "tdc", label: "Tarjeta de crédito" },
  { id: "tdd", label: "Tarjeta de débito" },
  { id: "cheque", label: "Cheque" },
] as const;

export const ROLES_PERSONA = [
  { id: "vendedor", label: "Vendedor" },
  { id: "comprador", label: "Comprador" },
  { id: "socio", label: "Socio" },
  { id: "contratista", label: "Contratista" },
  { id: "notario", label: "Notaría" },
  { id: "valuador", label: "Valuador" },
  { id: "otro", label: "Otro" },
] as const;

// --- Helpers ----------------------------------------------------------------

export function etapa(id: string) {
  return ETAPAS.find((e) => e.id === id) ?? ETAPAS[0];
}

export function estadoTramite(id: string) {
  return ESTADOS_TRAMITE.find((e) => e.id === id) ?? ESTADOS_TRAMITE[0];
}

export function categoriaGasto(id: string) {
  return CATEGORIAS_GASTO.find((c) => c.id === id);
}

export function labelCategoria(id: string) {
  return categoriaGasto(id)?.label ?? id;
}

/** Formatea a pesos mexicanos sin decimales, que es como los lees tú. */
export function mxn(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fechaCorta(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

// --- Personas ---------------------------------------------------------------

export const ESTADOS_CIVILES = [
  { id: "soltero", label: "Soltero(a)" },
  { id: "casado", label: "Casado(a)" },
  { id: "union_libre", label: "Unión libre" },
  { id: "divorciado", label: "Divorciado(a)" },
  { id: "viudo", label: "Viudo(a)" },
] as const;

/**
 * El régimen decide si el cónyuge tiene que firmar la escritura y si hace
 * falta el trámite 6 (acta de matrimonio). Es de los datos que más atoran
 * un cierre cuando se descubre tarde.
 */
export const REGIMENES = [
  { id: "bienes_mancomunados", label: "Bienes mancomunados", nota: "El cónyuge firma" },
  { id: "separacion_de_bienes", label: "Separación de bienes", nota: "El cónyuge no firma" },
] as const;

export function estadoCivil(id: string | null) {
  return ESTADOS_CIVILES.find((e) => e.id === id);
}

export function regimen(id: string | null) {
  return REGIMENES.find((r) => r.id === id);
}

/** ¿Este estado civil obliga a preguntar por el régimen? */
export function pideRegimen(estadoCivil: string | null): boolean {
  return estadoCivil === "casado";
}
