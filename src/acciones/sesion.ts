"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  verificarPassword,
  iniciarSesion,
  cerrarSesion,
  marcarPendiente2fa,
  usuarioPendiente2fa,
  limpiarPendiente2fa,
  usuarioActual,
} from "@/lib/sesion";
import { validar, EsquemaLogin, EsquemaCodigo } from "@/lib/esquemas";
import { puedeIntentar, registrarFallo, limpiarIntentos } from "@/lib/limitador";
import { registrar } from "@/lib/bitacora";
import { descifrar } from "@/lib/cripto";
import { verificarCodigo } from "@/lib/totp";

export type ResultadoEntrar = { error: string } | null;

function mensajeBloqueo(segundos: number): string {
  const minutos = Math.ceil(segundos / 60);
  return `Demasiados intentos. Vuelve a probar en ${minutos} ${
    minutos === 1 ? "minuto" : "minutos"
  }.`;
}

/**
 * Paso 1: correo y contraseña.
 *
 *  · Nunca decimos si falló el correo o la contraseña: eso le diría a un
 *    atacante qué correos existen.
 *  · Cinco intentos fallidos bloquean quince minutos.
 *  · Si la cuenta tiene segundo factor, la contraseña correcta NO abre la
 *    sesión: solo da paso a la pantalla del código.
 */
export async function entrar(
  _previo: ResultadoEntrar,
  formData: FormData
): Promise<ResultadoEntrar> {
  const v = validar(EsquemaLogin, formData);
  if (!v.ok) return { error: v.error };

  const { email, password } = v.datos;
  const clave = `login:${email}`;

  const freno = await puedeIntentar(clave);
  if (!freno.permitido) return { error: mensajeBloqueo(freno.segundosRestantes) };

  const usuario = await db.usuario.findUnique({ where: { email } });

  const credencialesOk =
    usuario?.activo &&
    usuario.passwordHash &&
    (await verificarPassword(password, usuario.passwordHash));

  if (!credencialesOk) {
    await registrarFallo(clave);
    return { error: "Correo o contraseña incorrectos." };
  }

  await limpiarIntentos(clave);

  if (usuario.totpActivo) {
    await marcarPendiente2fa(usuario.id);
    redirect("/entrar/codigo");
  }

  await iniciarSesion(usuario.id, { mfa: false });
  await registrar({
    tipoActor: usuario.rol === "admin" ? "admin" : "ayudante",
    actor: usuario.nombre,
    accion: "entro",
    entidad: "usuario",
    entidadId: usuario.id,
  });

  redirect(usuario.rol === "admin" ? "/" : "/ayudante");
}

/** Paso 2: el código de 6 dígitos de la app del celular. */
export async function entrarConCodigo(
  _previo: ResultadoEntrar,
  formData: FormData
): Promise<ResultadoEntrar> {
  const usuarioId = await usuarioPendiente2fa();
  if (!usuarioId) {
    return { error: "Pasaron más de 5 minutos. Vuelve a poner tu contraseña." };
  }

  const v = validar(EsquemaCodigo, formData);
  if (!v.ok) return { error: v.error };

  // El código también tiene freno: son solo un millón de combinaciones.
  const clave = `2fa:${usuarioId}`;
  const freno = await puedeIntentar(clave);
  if (!freno.permitido) return { error: mensajeBloqueo(freno.segundosRestantes) };

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario?.activo || !usuario.totpActivo || !usuario.totpSecretoCifrado) {
    return { error: "Esta cuenta no tiene segundo factor activo." };
  }

  const paso = verificarCodigo(descifrar(usuario.totpSecretoCifrado), v.datos.codigo, {
    ultimoPasoUsado: usuario.totpUltimoPaso,
  });

  if (paso === null) {
    await registrarFallo(clave);
    return { error: "Ese código no es válido. Usa el que aparece ahorita en tu app." };
  }

  await limpiarIntentos(clave);
  // Se guarda el paso para que este código no se pueda volver a usar.
  await db.usuario.update({ where: { id: usuario.id }, data: { totpUltimoPaso: paso } });
  await limpiarPendiente2fa();
  await iniciarSesion(usuario.id, { mfa: true });

  await registrar({
    tipoActor: usuario.rol === "admin" ? "admin" : "ayudante",
    actor: usuario.nombre,
    accion: "entro",
    entidad: "usuario",
    entidadId: usuario.id,
    detalle: "con segundo factor",
  });

  redirect(usuario.rol === "admin" ? "/" : "/ayudante");
}

export async function salir() {
  await cerrarSesion();
  redirect("/entrar");
}

// --- Activación del segundo factor ------------------------------------------

export type ResultadoActivar = { error: string } | null;

export async function confirmarSegundoFactor(
  _previo: ResultadoActivar,
  formData: FormData
): Promise<ResultadoActivar> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar");

  const v = validar(EsquemaCodigo, formData);
  if (!v.ok) return { error: v.error };

  const clave = `2fa:${usuario.id}`;
  const freno = await puedeIntentar(clave);
  if (!freno.permitido) return { error: mensajeBloqueo(freno.segundosRestantes) };

  const actual = await db.usuario.findUnique({ where: { id: usuario.id } });
  if (!actual?.totpSecretoCifrado) {
    return { error: "Recarga la página para generar el código QR." };
  }

  const paso = verificarCodigo(descifrar(actual.totpSecretoCifrado), v.datos.codigo);
  if (paso === null) {
    await registrarFallo(clave);
    return {
      error:
        "Ese código no coincide. Revisa que escaneaste el QR de esta pantalla y que la hora de tu celular sea automática.",
    };
  }

  await limpiarIntentos(clave);
  await db.usuario.update({
    where: { id: usuario.id },
    data: { totpActivo: true, totpUltimoPaso: paso },
  });

  // La sesión actual se reemite ya con el segundo factor comprobado.
  await iniciarSesion(usuario.id, { mfa: true });

  await registrar({
    tipoActor: usuario.esAdmin ? "admin" : "ayudante",
    actor: usuario.nombre,
    accion: "activo_2fa",
    entidad: "usuario",
    entidadId: usuario.id,
  });

  redirect(usuario.esAdmin ? "/" : "/ayudante");
}
