import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { subllave } from "./cripto";

const scrypt = promisify(scryptCb) as (
  clave: string,
  sal: Buffer,
  largo: number
) => Promise<Buffer>;

// Sesiones de admin y ayudante.
//
// Sin librerías externas a propósito: hashing con scrypt y cookie firmada con
// HMAC, ambos de Node. Una dependencia menos que mantener y una superficie
// menos que auditar antes de publicar.
//
// Lo que ESTO NO resuelve y hay que hacer antes de publicar: segundo factor
// para el admin. Esa cuenta descifra las contraseñas de Infonavit, así que su
// contraseña sola no basta.

const COOKIE = "brick_sesion";
const DIAS_SESION = 14;

// --- Contraseñas -----------------------------------------------------------

/** Genera el hash que se guarda. Formato: "scrypt.<sal>.<hash>" */
export async function hashearPassword(password: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(password, sal, 64);
  return `scrypt.${sal.toString("base64url")}.${hash.toString("base64url")}`;
}

/** Comparación en tiempo constante: no filtra información por el reloj. */
export async function verificarPassword(
  password: string,
  guardado: string
): Promise<boolean> {
  const partes = guardado.split(".");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;

  const sal = Buffer.from(partes[1], "base64url");
  const esperado = Buffer.from(partes[2], "base64url");
  const calculado = await scrypt(password, sal, esperado.length);

  if (calculado.length !== esperado.length) return false;
  return timingSafeEqual(calculado, esperado);
}

// --- Cookie firmada --------------------------------------------------------

function firmar(datos: string): string {
  // Subllave propia: rotar sesiones no debe tocar las contraseñas cifradas.
  return createHmac("sha256", subllave("sesion")).update(datos).digest("base64url");
}

/**
 * mfa = la sesión pasó por el segundo factor. Una sesión sin mfa solo sirve
 * para llegar a la pantalla donde se activa (ver exigirAdmin en permisos.ts).
 */
type Contenido = { usuarioId: string; expira: number; mfa?: boolean };

function empaquetar(contenido: Contenido): string {
  const datos = Buffer.from(JSON.stringify(contenido)).toString("base64url");
  return `${datos}.${firmar(datos)}`;
}

function desempaquetar(valor: string): Contenido | null {
  const corte = valor.lastIndexOf(".");
  if (corte < 1) return null;

  const datos = valor.slice(0, corte);
  const firma = valor.slice(corte + 1);

  // Si la firma no cuadra, alguien editó la cookie a mano.
  const esperada = firmar(datos);
  if (firma.length !== esperada.length) return null;
  if (!timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;

  try {
    const contenido = JSON.parse(
      Buffer.from(datos, "base64url").toString("utf8")
    ) as Contenido;
    if (!contenido.usuarioId || contenido.expira < Date.now()) return null;
    return contenido;
  } catch {
    return null;
  }
}

export async function iniciarSesion(usuarioId: string, opciones: { mfa?: boolean } = {}) {
  const expira = Date.now() + DIAS_SESION * 24 * 60 * 60 * 1000;
  const galletas = await cookies();

  galletas.set(COOKIE, empaquetar({ usuarioId, expira, mfa: opciones.mfa ?? false }), {
    httpOnly: true, // el JavaScript de la página no la puede leer
    sameSite: "lax", // no viaja en peticiones desde otros sitios
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expira),
  });
}

export async function cerrarSesion() {
  const galletas = await cookies();
  galletas.delete(COOKIE);
}

// --- Quién está entrando ---------------------------------------------------

export type Sesion = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  esAdmin: boolean;
  /** Tiene el segundo factor configurado y confirmado. */
  totpActivo: boolean;
  /** Esta sesión en particular pasó por el código de 6 dígitos. */
  mfaVerificado: boolean;
};

/** El usuario de la petición actual, o null si no hay sesión válida. */
export async function usuarioActual(): Promise<Sesion | null> {
  const galletas = await cookies();
  const cruda = galletas.get(COOKIE)?.value;
  if (!cruda) return null;

  const contenido = desempaquetar(cruda);
  if (!contenido) return null;

  const usuario = await db.usuario.findUnique({
    where: { id: contenido.usuarioId },
  });
  // Si lo desactivaste, la sesión deja de servir aunque la cookie siga viva.
  if (!usuario || !usuario.activo) return null;

  // Si activó el segundo factor, una sesión que no pasó por él no sirve.
  // Cubre el caso de una cookie emitida antes de activarlo.
  if (usuario.totpActivo && !contenido.mfa) return null;

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    esAdmin: usuario.rol === "admin",
    totpActivo: usuario.totpActivo,
    mfaVerificado: contenido.mfa === true,
  };
}

// --- Paso intermedio: contraseña correcta, falta el código -----------------

const COOKIE_PENDIENTE = "brick_2fa";
/** Cinco minutos para teclear el código después de la contraseña. */
const MINUTOS_PENDIENTE = 5;

/**
 * Marca que la contraseña fue correcta y falta el código. NO es una sesión:
 * con esta cookie no se abre ninguna página, solo la de teclear el código.
 */
export async function marcarPendiente2fa(usuarioId: string) {
  const expira = Date.now() + MINUTOS_PENDIENTE * 60_000;
  const galletas = await cookies();
  galletas.set(COOKIE_PENDIENTE, empaquetar({ usuarioId, expira }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/entrar",
    expires: new Date(expira),
  });
}

/** El usuario a medio entrar, o null si no hay o ya caducó. */
export async function usuarioPendiente2fa(): Promise<string | null> {
  const galletas = await cookies();
  const cruda = galletas.get(COOKIE_PENDIENTE)?.value;
  if (!cruda) return null;
  return desempaquetar(cruda)?.usuarioId ?? null;
}

export async function limpiarPendiente2fa() {
  const galletas = await cookies();
  galletas.delete({ name: COOKIE_PENDIENTE, path: "/entrar" });
}
