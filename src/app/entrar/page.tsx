import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/sesion";
import { FormaEntrar } from "./form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Entrar — Grupo Brick" };

export default async function Entrar() {
  // Si ya hay sesión, no tiene caso volver a pedirla.
  const usuario = await usuarioActual();
  if (usuario) redirect(usuario.esAdmin ? "/" : "/ayudante");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold-500 text-sm font-bold text-brick-900">
          B
        </div>
        <span className="font-semibold tracking-tight">AppBrick</span>
      </div>

      <h1 className="mt-6 text-xl font-semibold">Entrar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Acceso para Grupo Brick. Si eres comprador o vendedor, usa el link que
        te mandaron por WhatsApp.
      </p>

      <FormaEntrar />
    </main>
  );
}
