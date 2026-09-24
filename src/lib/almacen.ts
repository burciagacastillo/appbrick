import { mkdir, writeFile, readFile, unlink, access } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, sep, posix } from "node:path";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { tipoReal, esImagen, type TipoSeguro } from "./tipos-archivo";

// Almacén de archivos: documentos de los expedientes y fotos del catálogo.
//
// Dos destinos, y el resto de la app no sabe cuál se usa — solo conoce
// "rutas relativas" como "propiedades/turmalina/documentos/8 - INE.pdf":
//
//   · local    → carpeta almacen/ en tu computadora (fuera de git)
//   · supabase → bucket privado de Supabase Storage
//
// Se usa Supabase si están SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
//
// POR QUÉ IMPORTA: en Vercel el disco se borra entre peticiones. Si la app
// publicada escribiera en disco, las INE que suben tus compradores
// desaparecerían sin avisar. Por eso, publicada y sin Supabase configurado,
// la app se niega a guardar en vez de fingir que guardó.

type Destino = "local" | "supabase";

function destino(): Destino {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return "supabase";

  if (process.env.VERCEL) {
    throw new Error(
      "Falta configurar Supabase Storage (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY). " +
        "Sin eso, los archivos se perderían: en Vercel el disco se borra solo."
    );
  }
  return "local";
}

const BUCKET = process.env.APPBRICK_BUCKET ?? "almacen";

let cliente: SupabaseClient | null = null;

/**
 * Cliente con la llave de servicio. Salta los permisos de Supabase, así que
 * SOLO existe en el servidor: nunca se importa desde un componente de cliente
 * ni lleva el prefijo NEXT_PUBLIC_, que la mandaría al navegador.
 */
function supabase(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

// Anclado a process.cwd() y a una subcarpeta fija: si se dejara abierto a
// cualquier ruta del .env, el empaquetador tiene que rastrear todo el proyecto
// como posible destino de escritura.
const RAIZ = join(process.cwd(), "almacen");

/** 20 MB. Una foto de celular pesa 3-5 MB; un PDF escaneado rara vez más. */
export const TAMANO_MAXIMO = 20 * 1024 * 1024;

/**
 * 50 MB para lo que sube Erick: una escritura escaneada es lo más pesado del
 * expediente. Es también el tope por archivo de Supabase gratis. Solo es
 * posible porque, publicada, el archivo va directo a Supabase y no pasa por
 * Vercel (que corta en 4.5 MB).
 */
export const TAMANO_MAXIMO_ADMIN = 50 * 1024 * 1024;

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
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const base = limpiarNombre(
    `${numero}${subTipo ?? ""} - ${sinAcentos(nombreTramite)} ${sinAcentos(nombrePropiedad)}`
  );
  return `${base}${extension}`;
}

/**
 * Normaliza una ruta relativa a diagonales normales y verifica que no escape.
 *
 * Las rutas se guardan en la base SIEMPRE con "/": en Windows path.join usa
 * "\", y una ruta guardada así en tu computadora no serviría como llave en
 * Supabase ni en el servidor Linux de Vercel.
 */
export function rutaSegura(rutaRelativa: string): string {
  const normal = posix.normalize(rutaRelativa.replace(/\\/g, "/"));
  if (normal.startsWith("../") || normal === ".." || normal.startsWith("/")) {
    throw new Error(`Ruta fuera del almacén: ${rutaRelativa}`);
  }
  return normal;
}

/**
 * Convierte una ruta relativa en absoluta y verifica que no se salga del
 * almacén local. Todo acceso a disco pasa por aquí.
 */
function resolverDentroDelAlmacen(rutaRelativa: string): string {
  const absoluta = resolve(RAIZ, rutaSegura(rutaRelativa));
  if (absoluta !== RAIZ && !absoluta.startsWith(RAIZ + sep)) {
    throw new Error(`Ruta fuera del almacén: ${rutaRelativa}`);
  }
  return absoluta;
}

/** Carpeta de una propiedad dentro del almacén. */
export function carpetaDe(propiedadId: string, tipo: "documentos" | "fotos" | "paquetes") {
  return posix.join("propiedades", limpiarNombre(propiedadId), tipo);
}

/**
 * Guarda un archivo y devuelve su ruta relativa. Si ya existe uno con ese
 * nombre, le agrega un sufijo en vez de sobrescribir: nunca se pierde un
 * documento porque otro se llamara igual.
 */
export async function guardar(
  rutaCarpeta: string,
  nombreArchivo: string,
  contenido: Buffer,
  tipo?: TipoSeguro
): Promise<string> {
  const limpio = limpiarNombre(nombreArchivo);
  if (!limpio) throw new Error("El nombre del archivo quedó vacío al limpiarlo");

  const carpeta = rutaSegura(rutaCarpeta);
  const ext = posix.extname(limpio);
  const sinExt = limpio.slice(0, limpio.length - ext.length);

  for (let intento = 0; intento <= 100; intento++) {
    const nombre = intento === 0 ? limpio : `${sinExt} (${intento})${ext}`;
    const ruta = rutaSegura(posix.join(carpeta, nombre));

    if (destino() === "supabase") {
      // upsert: false → si ya existe, Supabase lo rechaza y probamos otro
      // nombre. Así ni dos subidas simultáneas se pisan.
      const { error } = await supabase()
        .storage.from(BUCKET)
        .upload(ruta, contenido, {
          upsert: false,
          contentType: tipo ?? "application/octet-stream",
        });
      if (!error) return ruta;
      if (/exist|duplicate|409/i.test(`${error.message} ${"statusCode" in error ? error.statusCode : ""}`)) {
        continue;
      }
      throw new Error(`No se pudo guardar el archivo: ${error.message}`);
    }

    if (await existe(ruta)) continue;
    const absoluta = resolverDentroDelAlmacen(ruta);
    await mkdir(dirname(absoluta), { recursive: true });
    await writeFile(absoluta, contenido);
    return ruta;
  }

  throw new Error("Demasiados archivos con el mismo nombre");
}

export async function leer(rutaRelativa: string): Promise<Buffer> {
  const ruta = rutaSegura(rutaRelativa);

  if (destino() === "supabase") {
    const { data, error } = await supabase().storage.from(BUCKET).download(ruta);
    if (error || !data) throw new Error(`No se encontró el archivo: ${ruta}`);
    return Buffer.from(await data.arrayBuffer());
  }
  return readFile(resolverDentroDelAlmacen(ruta));
}

export async function eliminar(rutaRelativa: string): Promise<void> {
  const ruta = rutaSegura(rutaRelativa);

  if (destino() === "supabase") {
    const { error } = await supabase().storage.from(BUCKET).remove([ruta]);
    if (error) throw new Error(`No se pudo borrar: ${error.message}`);
    return;
  }
  await unlink(resolverDentroDelAlmacen(ruta));
}

export async function existe(rutaRelativa: string): Promise<boolean> {
  const ruta = rutaSegura(rutaRelativa);

  if (destino() === "supabase") {
    const carpeta = posix.dirname(ruta);
    const nombre = posix.basename(ruta);
    const { data } = await supabase().storage.from(BUCKET).list(carpeta, { search: nombre });
    return Boolean(data?.some((f) => f.name === nombre));
  }

  try {
    await access(resolverDentroDelAlmacen(ruta));
    return true;
  } catch {
    return false;
  }
}

// --- Entrega directa -----------------------------------------------------------
//
// Vercel también corta en 4.5 MB lo que ENTREGA, no solo lo que recibe: un PDF
// de 10 MB servido a través de la app nunca llegaría. Publicada, la app revisa
// el permiso, deja el registro en bitácora y después manda al navegador a un
// link de Supabase que caduca en segundos.

/** Link temporal de lectura (solo publicada; null en tu computadora). */
export async function enlaceTemporal(
  rutaRelativa: string,
  opciones: { segundos?: number; descargarComo?: string } = {}
): Promise<string | null> {
  if (destino() !== "supabase") return null;

  const ruta = rutaSegura(rutaRelativa);
  const { data, error } = await supabase()
    .storage.from(BUCKET)
    .createSignedUrl(
      ruta,
      opciones.segundos ?? 60,
      opciones.descargarComo ? { download: opciones.descargarComo } : undefined
    );
  if (error || !data) throw new Error(`No se encontró el archivo: ${ruta}`);
  return data.signedUrl;
}

/**
 * Guarda en una ruta FIJA, reemplazando lo que hubiera (a diferencia de
 * guardar(), que nunca pisa). Para archivos que se regeneran, como el paquete
 * del avalúo: no tiene caso acumular versiones viejas.
 */
export async function guardarReemplazando(
  rutaRelativa: string,
  contenido: Buffer,
  tipo: string
): Promise<string> {
  const ruta = rutaSegura(rutaRelativa);

  if (destino() === "supabase") {
    const { error } = await supabase()
      .storage.from(BUCKET)
      .upload(ruta, contenido, { contentType: tipo, upsert: true });
    if (error) throw new Error(`No se pudo guardar: ${error.message}`);
    return ruta;
  }

  const absoluta = resolverDentroDelAlmacen(ruta);
  await mkdir(dirname(absoluta), { recursive: true });
  await writeFile(absoluta, contenido);
  return ruta;
}

// --- Subida directa ----------------------------------------------------------
//
// Vercel gratis corta cualquier petición de más de 4.5 MB, y una escritura
// escaneada pesa 10. Por eso, publicada, el navegador manda el archivo DIRECTO
// a Supabase con un permiso de un solo uso, a una "sala de espera"
// (_entrantes/). Después la app lo lee de ahí, lo valida por sus bytes igual
// que siempre, y lo acomoda en su lugar definitivo. El navegador nunca decide
// dónde queda el archivo: solo recibe un nombre al azar en la sala de espera.

export const PREFIJO_ENTRANTES = "_entrantes/";

/** ¿Es una ruta de las que genera prepararSubidaDirecta? Solo esas se aceptan. */
export function esRutaEntrante(ruta: string): boolean {
  return /^_entrantes\/[a-f0-9]{32}$/.test(ruta);
}

/**
 * Permiso de subida directa a la sala de espera. Devuelve null en tu
 * computadora (almacén local): ahí no hay límite de 4.5 MB y el archivo viaja
 * por el formulario de siempre.
 */
export async function prepararSubidaDirecta(): Promise<{ ruta: string; url: string } | null> {
  if (destino() !== "supabase") return null;

  const ruta = `${PREFIJO_ENTRANTES}${randomBytes(16).toString("hex")}`;
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUploadUrl(ruta);
  if (error || !data) throw new Error(`No se pudo preparar la subida: ${error?.message}`);
  return { ruta, url: data.signedUrl };
}

/**
 * Valida un archivo subido. NO confía en el mimeType que declara el
 * navegador: lo deduce de los bytes. Devuelve el tipo verificado, que es el
 * único que se debe guardar y servir.
 */
export function validarArchivo(
  contenido: Buffer,
  opciones: { soloImagenes?: boolean; maximo?: number } = {}
):
  | { ok: true; tipo: TipoSeguro; extension: string }
  | { ok: false; error: string } {
  const maximo = opciones.maximo ?? TAMANO_MAXIMO;
  if (contenido.length === 0) {
    return { ok: false, error: "El archivo llegó vacío." };
  }
  if (contenido.length > maximo) {
    const pesa = Math.ceil(contenido.length / 1024 / 1024);
    const tope = Math.round(maximo / 1024 / 1024);
    return {
      ok: false,
      error:
        `El archivo pesa ${pesa} MB y el máximo es ${tope} MB. Si es un escaneo, ` +
        "escanéalo a menor resolución o tómale foto a cada hoja.",
    };
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
 * re-escaneo la necesitan igual. Solo tiene sentido en tu computadora: lee
 * tus carpetas de Windows, que la app publicada no puede ver.
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
