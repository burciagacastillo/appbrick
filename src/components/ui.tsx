import type { ReactNode } from "react";
import { etapa as buscarEtapa, estadoTramite } from "@/lib/constants";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-brick-700 dark:bg-brick-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ titulo, extra }: { titulo: string; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-brick-700">
      <h2 className="text-sm font-semibold tracking-tight">{titulo}</h2>
      {extra}
    </div>
  );
}

/** Número grande del tablero. */
export function Stat({
  label,
  valor,
  sub,
  tono = "normal",
}: {
  label: string;
  valor: ReactNode;
  sub?: ReactNode;
  tono?: "normal" | "alerta" | "bien";
}) {
  const color =
    tono === "alerta"
      ? "text-rose-600 dark:text-rose-400"
      : tono === "bien"
        ? "text-emerald-600 dark:text-emerald-400"
        : "";
  return (
    <Card className="px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular ${color}`}>{valor}</div>
      {sub ? <div className="mt-0.5 text-xs text-slate-500">{sub}</div> : null}
    </Card>
  );
}

const TONOS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
};

export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: keyof typeof TONOS | string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        TONOS[color] ?? TONOS.slate
      }`}
    >
      {children}
    </span>
  );
}

export function EtapaBadge({ id }: { id: string }) {
  const e = buscarEtapa(id);
  return <Badge color={e.color}>{e.label}</Badge>;
}

export function EstadoBadge({ id }: { id: string }) {
  const e = estadoTramite(id);
  return (
    <Badge color={e.color}>
      <span className="mr-1">{e.icono}</span>
      {e.label}
    </Badge>
  );
}

/** Barra de avance del expediente. */
export function Barra({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-brick-700">
      <div
        className="h-full rounded-full bg-gold-500 transition-all"
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-slate-500">{children}</div>
  );
}

// ---------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------

/**
 * Estilo único de los campos. Estaba copiado como cadena suelta en 7 archivos
 * —uno de ellos cuatro veces— así que cualquier ajuste visual había que
 * repetirlo a mano en todos.
 */
export const CLASE_CAMPO =
  "mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm " +
  "focus:border-brick-600 focus:outline-none focus:ring-1 focus:ring-brick-600 " +
  "dark:border-brick-700 dark:bg-brick-900";

/** Campo con su etiqueta. `children` es el input, select o textarea. */
export function Campo({
  etiqueta,
  nota,
  className = "",
  children,
}: {
  etiqueta: string;
  nota?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-xs ${className}`}>
      <span className="text-slate-500">{etiqueta}</span>
      {children}
      {nota ? <span className="mt-0.5 block text-slate-400">{nota}</span> : null}
    </label>
  );
}

/** Mensaje de error de un formulario, con el mismo aspecto en toda la app. */
export function ErrorCampo({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
      {children}
    </p>
  );
}

/** Confirmación breve tras guardar. */
export function Exito({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{children}</p>
  );
}
