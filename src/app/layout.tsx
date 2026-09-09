import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppBrick — Grupo Brick",
  description: "Trámites, avances y costos de Grupo Brick",
};

const NAV = [
  { href: "/", label: "Tablero" },
  { href: "/propiedades", label: "Propiedades" },
  { href: "/gastos", label: "Gastos" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        <header className="bg-brick-800 text-white sticky top-0 z-20 shadow-sm">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex h-14 items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="grid h-7 w-7 place-items-center rounded bg-gold-500 text-brick-900 text-sm font-bold">
                  B
                </span>
                <span className="hidden sm:inline">AppBrick</span>
              </Link>
              <nav className="flex items-center gap-1 text-sm">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-md px-3 py-1.5 text-brick-100 hover:bg-brick-700 hover:text-white transition-colors"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

        <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-slate-500">
          Grupo Brick · Chihuahua
        </footer>
      </body>
    </html>
  );
}
