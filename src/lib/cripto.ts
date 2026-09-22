import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  timingSafeEqual,
} from "node:crypto";

// Cifrado de credenciales de terceros (contraseñas del portal Infonavit).
//
// AES-256-GCM: además de cifrar, autentica. Si alguien altera el texto
// cifrado en la base, el descifrado falla en vez de devolver basura.
//
// LO QUE ESTO PROTEGE: que alguien se lleve el archivo de la base de datos.
// LO QUE NO PROTEGE: a alguien que entre como administrador — la app tiene
// que poder descifrar para mostrarte la contraseña, así que quien sea admin
// las ve. Por eso la cuenta de admin necesita segundo factor al publicar.
//
// La llave vive en APPBRICK_LLAVE_CIFRADO (.env, fuera de git). Si se pierde,
// las contraseñas guardadas son irrecuperables — y eso es lo correcto.

const ALGORITMO = "aes-256-gcm";
const LARGO_IV = 12; // 96 bits, lo recomendado para GCM
const LARGO_TAG = 16;

function obtenerLlave(): Buffer {
  const secreto = process.env.APPBRICK_LLAVE_CIFRADO;
  if (!secreto) {
    throw new Error(
      "Falta APPBRICK_LLAVE_CIFRADO en el .env. Genera una con: npm run llave"
    );
  }
  if (secreto.length < 32) {
    throw new Error(
      "APPBRICK_LLAVE_CIFRADO es muy corta. Genera una con: npm run llave"
    );
  }
  // Derivamos 32 bytes fijos del secreto, sea cual sea su largo.
  return createHash("sha256").update(secreto).digest();
}

/**
 * Cifra un texto. Devuelve "iv.tag.datos" en base64url, listo para guardar
 * en una columna de texto.
 */
export function cifrar(textoPlano: string): string {
  if (!textoPlano) throw new Error("No hay nada que cifrar");

  const iv = randomBytes(LARGO_IV);
  const cipher = createCipheriv(ALGORITMO, obtenerLlave(), iv);
  const datos = Buffer.concat([
    cipher.update(textoPlano, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    datos.toString("base64url"),
  ].join(".");
}

/**
 * Descifra lo que produjo cifrar(). Lanza si el texto fue alterado o si la
 * llave cambió — nunca devuelve un resultado silenciosamente incorrecto.
 */
export function descifrar(guardado: string): string {
  const partes = guardado.split(".");
  if (partes.length !== 3) {
    throw new Error("El texto cifrado no tiene el formato esperado");
  }

  const iv = Buffer.from(partes[0], "base64url");
  const tag = Buffer.from(partes[1], "base64url");
  const datos = Buffer.from(partes[2], "base64url");

  if (iv.length !== LARGO_IV || tag.length !== LARGO_TAG) {
    throw new Error("El texto cifrado está corrupto");
  }

  const decipher = createDecipheriv(ALGORITMO, obtenerLlave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(datos), decipher.final()]).toString(
    "utf8"
  );
}

/** Para mostrar "••••••" sin revelar el largo real de la contraseña. */
export const OCULTO = "••••••••";

// ---------------------------------------------------------------------------
// Tokens de invitación
// ---------------------------------------------------------------------------

/**
 * El token del link que se manda por WhatsApp. 32 bytes de aleatoriedad
 * criptográfica: adivinarlo por fuerza bruta no es realista.
 */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Comparación en tiempo constante, para no filtrar información por el reloj. */
export function tokensIguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** SHA-256 de un archivo, para detectar subidas duplicadas. */
export function hashArchivo(contenido: Buffer): string {
  return createHash("sha256").update(contenido).digest("hex");
}
