"use client";

import { useActionState } from "react";
import { entrar, type ResultadoEntrar } from "@/acciones/sesion";
import { BOTON_PRIMARIO, CLASE_CAMPO, ErrorCampo } from "@/components/ui";

export function FormaEntrar() {
  const [estado, accion, pendiente] = useActionState<ResultadoEntrar, FormData>(
    entrar,
    null
  );

  return (
    <form action={accion} className="mt-8 space-y-5">
      <label className="block text-sm">
        <span className="font-medium text-tinta">Correo</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          autoFocus
          className={`${CLASE_CAMPO} py-3`}
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-tinta">Contraseña</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={`${CLASE_CAMPO} py-3`}
        />
      </label>

      {estado?.error ? <ErrorCampo>{estado.error}</ErrorCampo> : null}

      <button type="submit" disabled={pendiente} className={`${BOTON_PRIMARIO} w-full py-3`}>
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
