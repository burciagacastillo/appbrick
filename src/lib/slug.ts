/**
 * Texto apto para URL: "Sierra la Escondida" → "sierra-la-escondida".
 * Se usa para el id de las propiedades nuevas y para el link del catálogo.
 */
export function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Rutas fijas bajo /propiedades/: una propiedad con ese id quedaría tapada. */
const IDS_RESERVADOS = new Set(["nueva"]);

/**
 * Id para una propiedad nueva a partir de su nombre: "Praderas 12" →
 * "praderas-12". Si ya existe (o es una ruta reservada), le agrega -2, -3…
 */
export async function idUnico(
  nombre: string,
  ocupado: (id: string) => Promise<boolean>
): Promise<string> {
  const base = aSlug(nombre) || "propiedad";
  let id = base;
  for (let n = 2; IDS_RESERVADOS.has(id) || (await ocupado(id)); n++) {
    id = `${base}-${n}`;
  }
  return id;
}
