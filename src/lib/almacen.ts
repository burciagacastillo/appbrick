import { mkdir, writeFile, readFile, unlink, access } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname, resolve, sep } from "node:path";
import { tipoReal, esImagen, type TipoSeguro } from "./tipos-archivo";

// Almacén de archivos.
//
// Hoy: carpeta local (almacen/ en la raíz, fuera de git).
// Al publicar: se cambia este archivo por el SDK de Supabase Storage o S3.
// El resto de la app solo conoce "rutas relativas" y no sabe dónde viven
// realmente los bytes — por eso migrar no obliga a tocar nada más.

// Anclado a process.cwd() y a una subcarpeta fija: si se dejara abierto a
// cualquier ruta del .env, el empaquetador tiene que rastrear todo el proyecto
// como posible destino de escritura.
const RAIZ = join(process.cwd(), "almacen");

/** 20 MB. Una foto de celular pesa 3-5 MB; un PDF escaneado rara vez más. */
export const TAMANO_MAXIMO = 20 * 1024 * 1024;

/**
 * Limpia un nombre de archivo. Esto NO es cosmético: sin esto, alguien puede
 * subir un archivo llamado "../../../.env" y escribir fuera del almacén.
 * Como aquí suben terceros por link, es la defensa principal.
 */
export function limpiarNombre(nombre: string): string {
  return nombre
    .normalize("NFC")
    // Fuera separadores de ruta y caracteres que Windows no acepta.
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    // Fuera los ".." que permitirían subir de carpeta.
    .replace(/\.{2,}/g, ".")
    .replace(/^[.\s]+/, "")
    // Quitar caracteres deja huecos dobles ("INE / identificación" → "INE  ident").
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 180);
}

/**
 * Arma el nombre con TU convención, para que el escáner de carpetas siga
 * entendiéndolo aunque el archivo lo haya subido un comprador desde su celular:
 *
 *   nombrarConConvencion(21, "a", "Constancia de zonificación", "Sierra la Escondida", ".pdf")
 *   → "21a - Constancia de zonificacion Sierra la Escondida.pdf"
 */
export function nombrarConConvencion(
  numero: number,
  subTipo: string | null,
  nombreTramite: string,
  nombrePropiedad: string,
  extension: string
): string {
  const sinAcentos = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "");

  const base = limpiarNombre(
    `${numero}${subTipo ?? ""} - ${sinAcentos(nombreTramite)} ${sinAcentos(nombrePropiedad)}`
  );
  return `${base}${extension}`;
}

/**
 * Convierte una ruta relativa en absoluta y verifica que no se salga del
 * almacén. Todo acceso a disco pasa por aquí.
 */
function resolverDentroDelAlmacen(rutaRelativa: string): string {
  const absoluta = resolve(RAIZ, rutaRelativa);
  if (absoluta !== RAIZ && !absoluta.startsWith(RAIZ + sep)) {
    throw new Error(`Ruta fuera del almacén: ${rutaRelativa}`);
  }
  return absoluta;
}

/** Carpeta de una propiedad dentro del almacén. */
export function carpetaDe(propiedadId: string, tipo: "documentos" | "fotos") {
  return join("propiedades", limpiarNombre(propiedadId), tipo);
}

/**
 * Guarda un archivo y devuelve su ruta relativa. Si ya existe uno con ese
 * nombre, le agrega un sufijo en vez de sobrescribir: nunca se pierde un
 * documento porque otro se llamara igual.
 */
export async function guardar(
  rutaCarpeta: string,
  nombreArchivo: string,
  contenido: Buffer
): Promise<string> {
  const limpio = limpiarNombre(nombreArchivo);
  if (!limpio) throw new Error("El nombre del archivo quedó vacío al limpiarlo");

  let rutaRelativa = join(rutaCarpeta, limpio);
  let absoluta = resolverDentroDelAlmacen(rutaRelativa);

  const ext = extname(limpio);
  const sinExt = limpio.slice(0, limpio.length - ext.length);
  let intento = 1;
  while (await existe(rutaRelativa)) {
    rutaRelativa = join(rutaCarpeta, `${sinExt} (${intento})${ext}`);
    absoluta = resolverDentroDelAlmacen(rutaRelativa);
    intento++;
    if (intento > 100) throw new Error("Demasiados archivos con el mismo nombre");
  }

  await mkdir(dirname(absoluta), { recursive: true });
  await writeFile(absoluta, contenido);
  return rutaRelativa;
}

export async function leer(rutaRelativa: string): Promise<Buffer> {
  return readFile(resolverDentroDelAlmacen(rutaRelativa));
}

export async function eliminar(rutaRelativa: string): Promise<void> {
  await unlink(resolverDentroDelAlmacen(rutaRelativa));
}

export async function existe(rutaRelativa: string): Promise<boolean> {
  try {
    await access(resolverDentroDelAlmacen(rutaRelativa));
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida un archivo subido. A diferencia de la versión anterior, NO confía en
 * el mimeType que declara el navegador: lo deduce de los bytes.
 * Devuelve el tipo verificado, que es el único que se debe guardar y servir.
 */
export function validarArchivo(
  contenido: Buffer,
  opciones: { soloImagenes?: boolean } = {}
):
  | { ok: true; tipo: TipoSeguro; extension: string }
  | { ok: false; error: string } {
  if (contenido.length === 0) {
    return { ok: false, error: "El archivo llegó vacío." };
  }
  if (contenido.length > TAMANO_MAXIMO) {
    const mb = Math.round(TAMANO_MAXIMO / 1024 / 1024);
    return { ok: false, error: `El archivo pasa de ${mb} MB.` };
  }

  const real = tipoReal(contenido);
  if (!real) {
    return {
      ok: false,
      error: "Solo se aceptan PDF y fotos (JPG, PNG, WEBP).",
    };
  }

  if (opciones.soloImagenes && !esImagen(real.tipo)) {
    return { ok: false, error: "Para el catálogo solo se aceptan fotos, no PDF." };
  }

  return { ok: true, tipo: real.tipo, extension: real.extension };
}

/**
 * Lista los archivos de una carpeta del disco. Vive aquí porque el seed y el
 * re-escaneo la necesitan igual, y tenerla dos veces ya había empezado a
 * divergir.
 */
export function listarArchivosDe(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => {
    try {
      return statSync(join(dir, f)).isFile();
    } catch {
      return false;
    }
  });
}
