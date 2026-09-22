"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verificarPassword, iniciarSesion, cerrarSesion } from "@/lib/sesion";
import { validar, EsquemaLogin } from "@/lib/esquemas";
import { puedeIntentar, registrarFallo, limpiarIntentos } from "@/lib/limitador";
import { registrar } from "@/lib/bitacora";

export type ResultadoEntrar = { error: string } | null;

/**
 * Entrar.
 *
 * Dos cosas deliberadas:
 *  · Nunca decimos si falló el correo o la contraseña: eso le diría a un
 *    atacante qué correos existen.
 *  · Cinco intentos fallidos bloquean quince minutos. Sin eso, la cuenta que
 *    descifra las contraseñas de Infonavit la protege solo la fuerza bruta.
 */
export async function entrar(
  _previo: ResultadoEntrar,
  formData: FormData
): Promise<ResultadoEntrar> {
  const v = validar(EsquemaLogin, formData);
  // El mensaje viene del esquema: "Falta el correo" es más útil que un
  // genérico que no dice cuál de los dos falta.
  if (!v.ok) return { error: v.error };

  const { email, password } = v.datos;

  const freno = puedeIntentar(email);
  if (!freno.permitido) {
    const minutos = Math.ceil(freno.segundosRestantes / 60);
    return {
      error: `Demasiados intentos. Vuelve a probar en ${minutos} ${
        minutos === 1 ? "minuto" : "minutos"
      }.`,
    };
  }

  const usuario = await db.usuario.findUnique({ where: { email } });

  const credencialesOk =
    usuario?.activo &&
    usuario.passwordHash &&
    (await verificarPassword(password, usuario.passwordHash));

  if (!credencialesOk) {
    registrarFallo(email);
    return { error: "Correo o contraseña incorrectos." };
  }

  limpiarIntentos(email);
  await iniciarSesion(usuario.id);

  await registrar({
    tipoActor: usuario.rol === "admin" ? "admin" : "ayudante",
    actor: usuario.nombre,
    accion: "entro",
    entidad: "usuario",
    entidadId: usuario.id,
  });

  redirect(usuario.rol === "admin" ? "/" : "/ayudante");
}

export async function salir() {
  await cerrarSesion();
  redirect("/entrar");
}
