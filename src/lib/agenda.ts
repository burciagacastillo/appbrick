// La agenda: pasos, firmas, cierres y documentos que se vencen, ordenados por
// día. Lógica pura (sin base) para poder probarla.
//
// Todo se cuenta en días de CHIHUAHUA, no del servidor: Vercel corre en UTC y
// a las 7 de la noche de Chihuahua ya es "mañana" en UTC. Un día se maneja
// como texto "2026-11-08": comparar y ordenar textos así es comparar fechas.

export const ZONA = "America/Chihuahua";

const FORMATO_DIA = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** El día (en Chihuahua) de un instante: "2026-11-08". */
export function claveDia(d: Date): string {
  return FORMATO_DIA.format(d);
}

/** Hoy en Chihuahua. */
export function hoy(ahora: Date = new Date()): string {
  return claveDia(ahora);
}

function partes(dia: string): [number, number, number] {
  const [a, m, d] = dia.split("-").map(Number);
  return [a, m, d];
}

/** Suma días de calendario a "2026-11-08" (sin horas: no le afectan zonas). */
export function sumarDias(dia: string, n: number): string {
  const [a, m, d] = partes(dia);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Lunes = 0 … domingo = 6. */
export function diaDeLaSemana(dia: string): number {
  const [a, m, d] = partes(dia);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * "2026-11-08" que exista de verdad. Ojo: JavaScript acepta "2026-02-31" y lo
 * convierte en silencio en el 3 de marzo; aquí se rechaza (ida y vuelta).
 */
export function diaValido(dia: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const [a, m, d] = partes(dia);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/**
 * El instante que se guarda para un día elegido en un formulario: mediodía en
 * Chihuahua (18:00 UTC). A mediodía, ninguna zona razonable lo cambia de día.
 */
export function instanteDelDia(dia: string): Date {
  return new Date(`${dia}T18:00:00Z`);
}

const DIA_CORTO = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "lun 10 nov". */
export function diaCorto(dia: string): string {
  const [a, m, d] = partes(dia);
  return DIA_CORTO.format(new Date(Date.UTC(a, m - 1, d))).replace(/\./g, "");
}

/** "Hoy", "Mañana", "Ayer" o "lun 10 nov". */
export function etiquetaDia(dia: string, hoyDia: string): string {
  if (dia === hoyDia) return "Hoy";
  if (dia === sumarDias(hoyDia, 1)) return "Mañana";
  if (dia === sumarDias(hoyDia, -1)) return "Ayer";
  return diaCorto(dia);
}

// ---------------------------------------------------------------------------

export type TipoEvento = "paso" | "firma" | "cierre" | "vence";

export type Evento = {
  /** Único en toda la agenda (sirve de key). */
  clave: string;
  tipo: TipoEvento;
  /** null = paso sin fecha. */
  dia: string | null;
  hora: string | null;
  titulo: string;
  propiedadId: string;
  propiedadNombre: string;
  /** Solo en pasos. */
  pasoId?: string;
  hecho?: boolean;
};

/** Orden dentro de un día: lo que tiene hora primero, por hora; luego el resto. */
function porHora(a: Evento, b: Evento): number {
  if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
  if (a.hora) return -1;
  if (b.hora) return 1;
  return a.titulo.localeCompare(b.titulo, "es");
}

function porDia(a: Evento, b: Evento): number {
  return (a.dia ?? "").localeCompare(b.dia ?? "") || porHora(a, b);
}

/** Lo que se quedó atrás y todavía pide algo: pasos sin hacer y documentos ya vencidos. */
function esAtrasado(e: Evento, hoyDia: string): boolean {
  if (!e.dia || e.dia >= hoyDia) return false;
  return (e.tipo === "paso" && !e.hecho) || e.tipo === "vence";
}

export type Semana = {
  atrasados: Evento[];
  dias: { dia: string; eventos: Evento[] }[];
  sinFecha: Evento[];
};

/**
 * "Esta semana": hoy y los seis días que siguen. Los pasos hechos no salen
 * (ya no piden nada). Una firma o un cierre que ya pasó tampoco: no hay nada
 * que hacer con ellos; un paso atrasado o un recibo vencido sí.
 */
export function armarSemana(eventos: Evento[], hoyDia: string): Semana {
  const vivos = eventos.filter((e) => !(e.tipo === "paso" && e.hecho));
  return {
    atrasados: vivos.filter((e) => esAtrasado(e, hoyDia)).sort(porDia),
    dias: Array.from({ length: 7 }, (_, i) => {
      const dia = sumarDias(hoyDia, i);
      return { dia, eventos: vivos.filter((e) => e.dia === dia).sort(porHora) };
    }),
    sinFecha: vivos
      .filter((e) => e.tipo === "paso" && !e.dia)
      .sort((a, b) => a.propiedadNombre.localeCompare(b.propiedadNombre, "es")),
  };
}

export type DiaDelMes = { dia: string; delMes: boolean; esHoy: boolean; eventos: Evento[] };

/** Valida "2026-11" (lo que llega por la URL). */
export function mesValido(mes: unknown): mes is string {
  return typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function mesDe(dia: string): string {
  return dia.slice(0, 7);
}

export function mesVecino(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

const NOMBRE_MES = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "long", year: "numeric" });

export function nombreMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return NOMBRE_MES.format(new Date(Date.UTC(a, m - 1, 15)));
}

/** Primer y último día que pinta la cuadrícula del mes (semanas completas, de lunes a domingo). */
export function rangoDelMes(mes: string): { desde: string; hasta: string } {
  const primero = `${mes}-01`;
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  return {
    desde: sumarDias(primero, -diaDeLaSemana(primero)),
    hasta: sumarDias(ultimo, 6 - diaDeLaSemana(ultimo)),
  };
}

/**
 * La cuadrícula del calendario: semanas completas de lunes a domingo. Aquí sí
 * salen los pasos hechos (tachados en la pantalla): es la historia del mes.
 */
export function armarMes(eventos: Evento[], mes: string, hoyDia: string): DiaDelMes[][] {
  const { desde, hasta } = rangoDelMes(mes);
  const semanas: DiaDelMes[][] = [];
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
    if (diaDeLaSemana(dia) === 0) semanas.push([]);
    semanas[semanas.length - 1].push({
      dia,
      delMes: dia.startsWith(mes),
      esHoy: dia === hoyDia,
      eventos: eventos.filter((e) => e.dia === dia).sort(porHora),
    });
  }
  return semanas;
}

/** Cómo se lee la fecha de un paso junto a su nombre: "Hoy", "Venció ayer", "lun 10 nov". */
export function etiquetaPaso(dia: string | null, hoyDia: string): { texto: string; atrasado: boolean } | null {
  if (!dia) return null;
  if (dia < hoyDia) {
    return { texto: dia === sumarDias(hoyDia, -1) ? "Venció ayer" : `Venció ${etiquetaDia(dia, hoyDia)}`, atrasado: true };
  }
  return { texto: etiquetaDia(dia, hoyDia), atrasado: false };
}
