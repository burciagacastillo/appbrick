import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";

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

function llaveFirma(): string {
  const llave = process.env.APPBRICK_LLAVE_CIFRADO;
  if (!llave) throw new Error("Falta APPBRICK_LLAVE_CIFRADO en el .env");
  return llave;
}

function firmar(datos: string): string {
  return createHmac("sha256", llaveFirma()).update(datos).digest("base64url");
}

type Contenido = { usuarioId: string; expira: number };

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

export async function iniciarSesion(usuarioId: string) {
  const expira = Date.now() + DIAS_SESION * 24 * 60 * 60 * 1000;
  const galletas = await cookies();

  galletas.set(COOKIE, empaquetar({ usuarioId, expira }), {
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

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    esAdmin: usuario.rol === "admin",
  };
}
