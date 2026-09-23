import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { exigirSesion } from "@/lib/permisos";
import { salir } from "@/acciones/sesion";
import { MenuCrear, Navegacion } from "@/components/navegacion";

// Cara interna: admin y ayudante. El menú vive aquí y solo aquí, para que ni
// el invitado ni el visitante del catálogo público lo vean nunca.
//
// Ojo: este layout corta el paso a quien no tenga sesión, pero cada página
// vuelve a pedir su permiso por su cuenta. Los layouts de Next no son una
// garantía de seguridad — no se ejecutan en todas las formas de acceder a una
// página. La puerta de cada página es la que cuenta.

export const metadata: Metadata = {
  title: "AppBrick — Grupo Brick",
  description: "Trámites, avances y costos de Grupo Brick",
};

function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-brick-800 text-sm font-bold text-gold-400">
        B
      </span>
      <span className="text-[15px] font-semibold tracking-tight">AppBrick</span>
    </Link>
  );
}

export default async function LayoutInterno({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirSesion();
  const inicio = usuario.esAdmin ? "/" : "/ayudante";
  const inicial = usuario.nombre.trim().charAt(0).toUpperCase() || "?";
  // El ayudante busca dentro de SUS documentos; el admin, en todo.
  const destinoBusqueda = usuario.esAdmin ? "/buscar" : "/ayudante";

  return (
    <div className="flex min-h-screen">
      {/* Menú lateral: solo en pantalla ancha. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-linea/60 bg-white px-5 py-6 md:flex">
        <Logo href={inicio} />

        <div className="mt-10 mb-3 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menú
        </div>
        <Navegacion esAdmin={usuario.esAdmin} modo="lateral" />

        <div className="mt-auto space-y-4">
          <Link
            href="/cuenta/segundo-factor"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
              usuario.totpActivo
                ? "text-emerald-700 hover:bg-emerald-50"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            {usuario.totpActivo ? (
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
            )}
            {usuario.totpActivo ? "Segundo factor activo" : "Activa tu segundo factor"}
          </Link>
          <p className="px-3 text-[11px] text-slate-400">Grupo Brick · Chihuahua</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-linea/60 bg-white/80 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-8">
            <div className="md:hidden">
              <Logo href={inicio} />
            </div>

            <form
              action={destinoBusqueda}
              role="search"
              className="mx-auto hidden w-full max-w-md sm:block"
            >
              <label className="relative block">
                <span className="sr-only">Buscar</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  type="search"
                  name="q"
                  placeholder={
                    usuario.esAdmin
                      ? "Buscar propiedad, persona o trámite…"
                      : "Buscar documento…"
                  }
                  className="w-full rounded-xl border-0 bg-slate-100/80 py-2.5 pr-4 pl-10 text-sm text-tinta placeholder:text-slate-400 transition-all focus:bg-white focus:ring-4 focus:ring-brick-600/10 focus:outline-none"
                />
              </label>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
              {usuario.esAdmin ? <MenuCrear /> : null}

              <div
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brick-700 to-brick-900 text-sm font-semibold text-white"
                title={`${usuario.nombre}${usuario.esAdmin ? "" : " · ayudante"}`}
              >
                {inicial}
              </div>

              <form action={salir}>
                <button
                  type="submit"
                  className="grid h-9 w-9 place-items-center rounded-xl text-tenue transition-colors hover:bg-slate-100 hover:text-tinta"
                  title="Salir"
                  aria-label="Salir"
                >
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              </form>
            </div>
          </div>

          {/* En celular: buscador y pestañas debajo, deslizables. */}
          <div className="space-y-2 px-4 pb-3 md:hidden">
            <form action={destinoBusqueda} role="search" className="sm:hidden">
              <input
                type="search"
                name="q"
                placeholder="Buscar…"
                aria-label="Buscar"
                className="w-full rounded-xl border-0 bg-slate-100/80 px-4 py-2 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-brick-600/10 focus:outline-none"
              />
            </form>
            <Navegacion esAdmin={usuario.esAdmin} modo="horizontal" />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
