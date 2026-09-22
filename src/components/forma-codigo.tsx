"use client";

import { useActionState } from "react";
import { ErrorCampo } from "./ui";

// Campo de 6 dígitos. Un solo componente para entrar y para activar: la
// experiencia tiene que ser idéntica o la gente se confunde.

type Accion = (previo: { error: string } | null, formData: FormData) => Promise<{ error: string } | null>;

export function FormaCodigo({ accion, boton }: { accion: Accion; boton: string }) {
  const [estado, enviar, pendiente] = useActionState(accion, null);

  return (
    <form action={enviar} className="mt-5 space-y-3">
      <input
        name="codigo"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        autoFocus
        placeholder="000000"
        className="w-full rounded-lg border border-slate-200 px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] dark:border-brick-700 dark:bg-brick-900"
      />
      {estado?.error ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
      <button
        type="submit"
        disabled={pendiente}
        className="w-full rounded-lg bg-brick-800 px-4 py-2.5 font-medium text-white hover:bg-brick-700 disabled:opacity-60"
      >
        {pendiente ? "Verificando…" : boton}
      </button>
    </form>
  );
}
