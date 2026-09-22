"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verificarPassword, iniciarSesion, cerrarSesion } from "@/lib/sesion";

export type ResultadoEntrar = { error: string } | null;

/**
 * Entrar. Nunca decimos si falló el correo o la contraseña: eso le diría a un
 * atacante qué correos existen.
 */
export async function entrar(
  _previo: ResultadoEntrar,
  formData: FormData
): Promise<ResultadoEntrar> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Faltan el correo o la contraseña." };
  }

  const usuario = await db.usuario.findUnique({ where: { email } });

  if (!usuario || !usuario.activo || !usuario.passwordHash) {
    return { error: "Correo o contraseña incorrectos." };
  }

  if (!(await verificarPassword(password, usuario.passwordHash))) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await iniciarSesion(usuario.id);
  redirect(usuario.rol === "admin" ? "/" : "/ayudante");
}

export async function salir() {
  await cerrarSesion();
  redirect("/entrar");
}
