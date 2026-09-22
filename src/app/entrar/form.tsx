"use client";

import { useActionState } from "react";
import { entrar, type ResultadoEntrar } from "@/acciones/sesion";

export function FormaEntrar() {
  const [estado, accion, pendiente] = useActionState<ResultadoEntrar, FormData>(
    entrar,
    null
  );

  const input =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-brick-700 dark:bg-brick-900";

  return (
    <form action={accion} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="text-slate-500">Correo</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          autoFocus
          className={input}
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-500">Contraseña</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={input}
        />
      </label>

      {estado?.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {estado.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-lg bg-brick-800 px-4 py-2.5 font-medium text-white hover:bg-brick-700 disabled:opacity-60"
      >
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
