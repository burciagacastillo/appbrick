import type { Metadata } from "next";
import Link from "next/link";
import { exigirSesion } from "@/lib/permisos";
import { salir } from "@/acciones/sesion";

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

const NAV_ADMIN = [
  { href: "/", label: "Tablero" },
  { href: "/propiedades", label: "Propiedades" },
  { href: "/revisar", label: "Revisar" },
  { href: "/recordatorios", label: "Recordatorios" },
  { href: "/gastos", label: "Gastos" },
  { href: "/equipo", label: "Equipo" },
];

const NAV_AYUDANTE = [{ href: "/ayudante", label: "Documentos" }];

export default async function LayoutInterno({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await exigirSesion();
  const nav = usuario.esAdmin ? NAV_ADMIN : NAV_AYUDANTE;

  return (
    <>
      <header className="bg-brick-800 text-white sticky top-0 z-20 shadow-sm">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center gap-4">
            <Link
              href={usuario.esAdmin ? "/" : "/ayudante"}
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="grid h-7 w-7 place-items-center rounded bg-gold-500 text-brick-900 text-sm font-bold">
                B
              </span>
              <span className="hidden sm:inline">AppBrick</span>
            </Link>

            <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-brick-100 hover:bg-brick-700 hover:text-white transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-3 text-sm">
              <Link
                href="/cuenta/segundo-factor"
                className="hidden rounded-md px-2 py-1 text-brick-100 hover:bg-brick-700 hover:text-white sm:inline"
                title={usuario.totpActivo ? "Segundo factor activo" : "Activa tu segundo factor"}
              >
                {usuario.totpActivo ? "🔒" : "🔓 Activar 2FA"}
              </Link>
              <span className="hidden text-brick-100 sm:inline">
                {usuario.nombre}
                {usuario.esAdmin ? null : (
                  <span className="ml-1 text-xs text-brick-100/70">(ayudante)</span>
                )}
              </span>
              <form action={salir}>
                <button
                  type="submit"
                  className="rounded-md px-2 py-1 text-brick-100 hover:bg-brick-700 hover:text-white"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-slate-500">
        Grupo Brick · Chihuahua
      </footer>
    </>
  );
}
