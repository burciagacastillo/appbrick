import Link from "next/link";
import { redirect } from "next/navigation";
import { Smartphone } from "lucide-react";
import { usuarioPendiente2fa } from "@/lib/sesion";
import { entrarConCodigo } from "@/acciones/sesion";
import { FormaCodigo } from "@/components/forma-codigo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Código — Grupo Brick" };

export default async function PaginaCodigo() {
  // Sin la contraseña correcta de hace menos de 5 minutos, aquí no hay nada.
  if (!(await usuarioPendiente2fa())) redirect("/entrar");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="rounded-tarjeta bg-white p-8 shadow-suave ring-1 ring-black/[0.03] sm:p-10">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-tinta">
          <Smartphone className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Código de tu celular</h1>
        <p className="mt-2 text-sm leading-relaxed text-tenue">
          Abre tu app autenticadora y escribe los 6 números de AppBrick.
        </p>

        <FormaCodigo accion={entrarConCodigo} boton="Entrar" />
      </div>

      <Link
        href="/entrar"
        className="mt-6 text-center text-sm text-tenue transition-colors hover:text-tinta"
      >
        Volver a empezar
      </Link>
    </main>
  );
}
