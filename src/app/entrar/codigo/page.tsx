import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioPendiente2fa } from "@/lib/sesion";
import { entrarConCodigo } from "@/acciones/sesion";
import { FormaCodigo } from "@/components/forma-codigo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Código — Grupo Brick" };

export default async function PaginaCodigo() {
  // Sin la contraseña correcta de hace menos de 5 minutos, aquí no hay nada.
  if (!(await usuarioPendiente2fa())) redirect("/entrar");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold-500 text-sm font-bold text-brick-900">
        B
      </div>
      <h1 className="mt-6 text-xl font-semibold">Código de tu celular</h1>
      <p className="mt-1 text-sm text-slate-500">
        Abre tu app autenticadora y escribe los 6 números de AppBrick.
      </p>

      <FormaCodigo accion={entrarConCodigo} boton="Entrar" />

      <Link href="/entrar" className="mt-4 text-center text-xs text-slate-500 hover:underline">
        Volver a empezar
      </Link>
    </main>
  );
}
