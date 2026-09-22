import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Códigos de 6 dígitos que cambian cada 30 segundos (TOTP, RFC 6238).
// Es lo que usan Google Authenticator, Microsoft Authenticator, Authy, etc.
//
// Implementado con node:crypto en vez de una librería: son ~60 líneas, el
// estándar trae vectores de prueba oficiales (ver totp.test.ts), y es la
// puerta de la cuenta que descifra contraseñas de terceros — mejor poder
// leer cada línea.

const PERIODO = 30;
const DIGITOS = 6;
/** Se acepta el código anterior y el siguiente: tolera relojes desfasados. */
const VENTANA = 1;

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32(buf: Buffer): string {
  let bits = 0;
  let valor = 0;
  let salida = "";
  for (const byte of buf) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO_BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO_BASE32[(valor << (5 - bits)) & 31];
  return salida;
}

export function desdeBase32(texto: string): Buffer {
  const limpio = texto.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const c of limpio) {
    const i = ALFABETO_BASE32.indexOf(c);
    if (i === -1) throw new Error("Secreto base32 inválido");
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 20 bytes aleatorios: el tamaño que recomienda el estándar para SHA-1. */
export function generarSecreto(): string {
  return base32(randomBytes(20));
}

/** Número de paso de 30 segundos para un instante dado. */
export function pasoActual(ahoraMs = Date.now()): number {
  return Math.floor(ahoraMs / 1000 / PERIODO);
}

/** El código de un paso concreto (HOTP con el contador = paso). */
export function codigoPara(secreto: Buffer, paso: number, digitos = DIGITOS): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));

  const hmac = createHmac("sha1", secreto).update(contador).digest();
  const desfase = hmac[hmac.length - 1] & 0x0f;
  const binario =
    ((hmac[desfase] & 0x7f) << 24) |
    (hmac[desfase + 1] << 16) |
    (hmac[desfase + 2] << 8) |
    hmac[desfase + 3];

  return (binario % 10 ** digitos).toString().padStart(digitos, "0");
}

/**
 * Verifica un código. Devuelve el paso con el que coincidió, o null.
 *
 * `ultimoPasoUsado` impide reusar un código: sin eso, quien viera el código
 * por encima de tu hombro podría entrar con él durante los siguientes 30-60
 * segundos. Cada código sirve una sola vez.
 */
export function verificarCodigo(
  secretoBase32: string,
  codigo: string,
  opciones: { ultimoPasoUsado?: number | null; ahoraMs?: number } = {}
): number | null {
  const limpio = codigo.replace(/\s/g, "");
  if (!/^\d{6}$/.test(limpio)) return null;

  const secreto = desdeBase32(secretoBase32);
  const actual = pasoActual(opciones.ahoraMs);

  for (let d = -VENTANA; d <= VENTANA; d++) {
    const paso = actual + d;
    if (opciones.ultimoPasoUsado != null && paso <= opciones.ultimoPasoUsado) continue;

    const esperado = Buffer.from(codigoPara(secreto, paso));
    const recibido = Buffer.from(limpio);
    if (timingSafeEqual(esperado, recibido)) return paso;
  }
  return null;
}

/** Lo que lee la app del celular al escanear el QR. */
export function uriParaApp(secretoBase32: string, cuenta: string): string {
  const emisor = "AppBrick";
  const etiqueta = encodeURIComponent(`${emisor}:${cuenta}`);
  const params = new URLSearchParams({
    secret: secretoBase32,
    issuer: emisor,
    algorithm: "SHA1",
    digits: String(DIGITOS),
    period: String(PERIODO),
  });
  return `otpauth://totp/${etiqueta}?${params.toString()}`;
}
