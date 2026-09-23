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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="rounded-tarjeta bg-white p-8 shadow-suave ring-1 ring-black/[0.03] sm:p-10">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brick-800 text-base font-bold text-gold-400">
          B
        </span>

        <h1 className="mt-8 text-2xl font-bold tracking-tight">Entrar a AppBrick</h1>
        <p className="mt-2 text-sm leading-relaxed text-tenue">
          Acceso para el equipo de Grupo Brick. Si eres comprador o vendedor,
          usa el link que te mandaron por WhatsApp.
        </p>

        <FormaEntrar />
      </div>
    </main>
  );
}
