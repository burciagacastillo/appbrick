// Búsqueda dentro de una propiedad: "zoni", "predial", "constancias de
// zonificación", "21"… Vive aparte del componente para poder probarla.

export type ItemBuscable = {
  id: string;
  numero: number;
  nombre: string;
  estado: string;
  esDato: boolean;
  documentos: { id: string; etiqueta: string }[];
};

const IGNORAR = new Set(["de", "la", "del", "el", "los", "las", "y", "a", "en", "por", "con"]);

/**
 * Minúsculas y sin acentos. Se filtra por código de carácter en vez de con una
 * expresión con escapes: en esta máquina esos escapes ya se corrompieron dos
 * veces al escribir el archivo.
 */
export function normalizar(s: string): string {
  return Array.from(s.normalize("NFD").toLowerCase())
    .filter((c) => {
      const k = c.charCodeAt(0);
      return k < 0x300 || k > 0x36f;
    })
    .join("");
}

function palabras(s: string): string[] {
  return normalizar(s)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 0);
}

/**
 * Cuántas palabras de la búsqueda coinciden con el trámite. Se compara por el
 * inicio de la palabra y sin las dos últimas letras en palabras largas, para
 * que "constancias" encuentre "constancia" y "zoni" encuentre "zonificación".
 * Un número busca el trámite por su número del catálogo.
 */
function puntaje(item: ItemBuscable, consulta: string[]): number {
  const delNombre = palabras(item.nombre);
  let total = 0;
  for (const t of consulta) {
    if (/^[0-9]+$/.test(t)) {
      if (Number(t) === item.numero) total += 2;
      continue;
    }
    if (t.length < 3 || IGNORAR.has(t)) continue;
    const raiz = t.length > 5 ? t.slice(0, t.length - 2) : t;
    if (delNombre.some((p) => p.startsWith(raiz))) total++;
  }
  return total;
}

/** Los trámites que coinciden, del más parecido al menos. Máximo 8. */
export function buscarEnExpediente<T extends ItemBuscable>(items: T[], texto: string): T[] {
  const consulta = palabras(texto);
  if (consulta.length === 0) return [];
  return items
    .map((item) => ({ item, puntos: puntaje(item, consulta) }))
    .filter((r) => r.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || a.item.numero - b.item.numero)
    .slice(0, 8)
    .map((r) => r.item);
}
