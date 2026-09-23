"use client";

import { useActionState } from "react";
import { BOTON_PRIMARIO, ErrorCampo } from "./ui";

// Campo de 6 dígitos. Un solo componente para entrar y para activar: la
// experiencia tiene que ser idéntica o la gente se confunde.

type Accion = (previo: { error: string } | null, formData: FormData) => Promise<{ error: string } | null>;

export function FormaCodigo({ accion, boton }: { accion: Accion; boton: string }) {
  const [estado, enviar, pendiente] = useActionState(accion, null);

  return (
    <form action={enviar} className="mt-8 space-y-4">
      <input
        name="codigo"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        autoFocus
        placeholder="000000"
        className="w-full rounded-2xl border border-slate-200 bg-fondo px-3 py-4 text-center font-mono text-2xl tracking-[0.4em] transition-colors focus:border-brick-600 focus:bg-white focus:ring-4 focus:ring-brick-600/10 focus:outline-none"
      />
      {estado?.error ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
      <button type="submit" disabled={pendiente} className={`${BOTON_PRIMARIO} w-full py-3`}>
        {pendiente ? "Verificando…" : boton}
      </button>
    </form>
  );
}
