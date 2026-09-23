"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  Building2,
  FileCheck2,
  FolderOpen,
  LayoutGrid,
  Link2,
  Plus,
  Receipt,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Pestañas del menú interno. Es de cliente por una sola razón: saber en qué
// página estás para marcarla. Los permisos NO dependen de esto — cada página
// pide el suyo en el servidor; aquí solo se decide qué links pintar.

type Pestana = { href: string; label: string; icono: LucideIcon };

const ADMIN: Pestana[] = [
  { href: "/", label: "Tablero", icono: LayoutGrid },
  { href: "/propiedades", label: "Propiedades", icono: Building2 },
  { href: "/revisar", label: "Revisar", icono: FileCheck2 },
  { href: "/recordatorios", label: "Recordatorios", icono: BellRing },
  { href: "/gastos", label: "Gastos", icono: Wallet },
  { href: "/equipo", label: "Equipo", icono: Users },
];

const AYUDANTE: Pestana[] = [{ href: "/ayudante", label: "Documentos", icono: FolderOpen }];

const CREAR = [
  {
    href: "/gastos#registrar",
    label: "Registrar gasto",
    detalle: "De cualquier propiedad",
    icono: Receipt,
  },
  {
    href: "/recordatorios#invitar",
    label: "Link para subir documentos",
    detalle: "Para un comprador o vendedor",
    icono: Link2,
  },
];

/**
 * Botón "Crear" de la barra superior. Es de cliente para cerrarse solo al
 * elegir una opción o al picar fuera: un <details> vive en el layout, que no
 * se vuelve a pintar al navegar, y se quedaba abierto.
 */
export function MenuCrear() {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 rounded-xl bg-tinta px-3.5 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-slate-800 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        <span className="hidden sm:inline">Crear</span>
      </button>

      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-72 rounded-2xl bg-white p-1.5 shadow-flotante ring-1 ring-black/[0.04]"
        >
          {CREAR.map(({ href, label, detalle, icono: Icono }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-tinta">
                <Icono className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-sm font-medium text-tinta">{label}</span>
                <span className="block text-xs text-tenue">{detalle}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function activa(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * `lateral`: columna del menú izquierdo en pantalla ancha.
 * `horizontal`: renglón deslizable debajo de la barra superior, en celular.
 */
export function Navegacion({
  esAdmin,
  modo,
}: {
  esAdmin: boolean;
  modo: "lateral" | "horizontal";
}) {
  const pathname = usePathname();
  const pestanas = esAdmin ? ADMIN : AYUDANTE;
  const lateral = modo === "lateral";

  return (
    <nav
      className={
        lateral
          ? "flex flex-col gap-1"
          : "-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]"
      }
    >
      {pestanas.map(({ href, label, icono: Icono }) => {
        const esta = activa(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={esta ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-150 ${
              lateral ? "px-3 py-2.5" : "px-3 py-1.5"
            } ${
              esta
                ? "bg-slate-100 text-tinta"
                : "text-tenue hover:bg-slate-50 hover:text-tinta"
            }`}
          >
            {/* Indicador mínimo: una rayita a la izquierda de la activa. */}
            {esta && lateral ? (
              <span className="absolute top-2.5 bottom-2.5 -left-3 w-[3px] rounded-r-full bg-tinta" />
            ) : null}
            <Icono className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
