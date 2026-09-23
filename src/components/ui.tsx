import type { ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { etapa as buscarEtapa, estadoTramite } from "@/lib/constants";

// Sistema visual de AppBrick: blanco, bordes casi invisibles, mucho aire.
// Todo lo que se repite vive aquí; si una pantalla necesita "su" estilo de
// tarjeta o de botón, casi siempre es señal de que falta algo en este archivo.

// ---------------------------------------------------------------------------
// Botones
// ---------------------------------------------------------------------------

const BASE_BOTON =
  "inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium " +
  "transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

/** Acción principal de la pantalla: negro sólido, texto blanco. Una por vista. */
export const BOTON_PRIMARIO =
  `${BASE_BOTON} bg-tinta px-4 py-2.5 text-white hover:bg-slate-800`;

/** Acciones secundarias: blanco con un filo apenas visible. */
export const BOTON_SECUNDARIO =
  `${BASE_BOTON} bg-white px-3.5 py-2 text-tinta ring-1 ring-inset ring-linea hover:bg-slate-50`;

/** Acción que confirma algo bueno (aprobar). */
export const BOTON_EXITO =
  `${BASE_BOTON} bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700`;

/** Casi texto: para acciones discretas dentro de listas. */
export const BOTON_FANTASMA =
  `${BASE_BOTON} px-2.5 py-1.5 text-tenue hover:bg-slate-100 hover:text-tinta`;

// ---------------------------------------------------------------------------
// Estructura
// ---------------------------------------------------------------------------

/** Título de cada pantalla, con su descripción corta y acciones a la derecha. */
export function Encabezado({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-tinta">{titulo}</h1>
        {descripcion ? <p className="mt-1 text-sm text-tenue">{descripcion}</p> : null}
      </div>
      {acciones}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-tarjeta bg-white shadow-suave ring-1 ring-black/[0.03] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ titulo, extra }: { titulo: string; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
      <h2 className="text-[15px] font-semibold tracking-tight text-tinta">{titulo}</h2>
      {extra}
    </div>
  );
}

/** Cápsula pequeña junto a un número: "+18%", "3 vencidos". */
export function Insignia({
  children,
  tono = "bien",
}: {
  children: ReactNode;
  tono?: "bien" | "alerta" | "neutro";
}) {
  const clase =
    tono === "bien"
      ? "bg-[#e6f4ea] text-emerald-700"
      : tono === "alerta"
        ? "bg-rose-50 text-rose-600"
        : "bg-slate-100 text-tenue";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular ${clase}`}>
      {children}
    </span>
  );
}

/**
 * Número grande del tablero. El valor va SIEMPRE en tinta negra: el tono
 * (bien / alerta) lo carga la insignia de al lado, no el número.
 */
export function Stat({
  label,
  valor,
  sub,
  insignia,
  tono = "bien",
}: {
  label: string;
  valor: ReactNode;
  sub?: ReactNode;
  insignia?: ReactNode;
  tono?: "bien" | "alerta" | "neutro";
}) {
  return (
    <Card className="px-6 py-5">
      <div className="text-[13px] font-medium text-tenue">{label}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[30px] leading-none font-bold tracking-tight text-tinta tabular">
          {valor}
        </span>
        {insignia != null ? <Insignia tono={tono}>{insignia}</Insignia> : null}
      </div>
      {sub ? <div className="mt-3 text-xs text-tenue">{sub}</div> : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

// Fondo muy claro + texto del mismo tono + un anillo apenas visible.
const TONOS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/15",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/15",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  rose: "bg-rose-50 text-rose-600 ring-rose-600/15",
};

const PUNTOS: Record<string, string> = {
  slate: "bg-slate-400",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
};

export function Badge({
  children,
  color = "slate",
  punto = false,
}: {
  children: ReactNode;
  color?: keyof typeof TONOS | string;
  /** Un punto de color antes del texto: para estados que se leen de reojo. */
  punto?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        TONOS[color] ?? TONOS.slate
      }`}
    >
      {punto ? (
        <span className={`h-1.5 w-1.5 rounded-full ${PUNTOS[color] ?? PUNTOS.slate}`} />
      ) : null}
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
    <Badge color={e.color} punto>
      {e.label}
    </Badge>
  );
}

/** Avance del expediente: una línea de 4px, sin nada que distraiga. */
export function Barra({ porcentaje }: { porcentaje: number }) {
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={porcentaje}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brick-800 transition-[width] duration-500"
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}

/**
 * Estado vacío. Con `icono` y `titulo` se vuelve el estado vacío "grande"
 * (ícono lineal en un círculo); sin ellos, una línea de texto discreta.
 */
export function Vacio({
  children,
  icono,
  titulo,
}: {
  children: ReactNode;
  icono?: ReactNode;
  titulo?: string;
}) {
  if (!icono && !titulo) {
    return <div className="px-5 py-8 text-center text-sm text-tenue">{children}</div>;
  }
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icono ? (
        <div className="grid h-14 w-14 place-items-center rounded-full border border-linea bg-fondo text-slate-400">
          {icono}
        </div>
      ) : null}
      {titulo ? <p className="mt-4 text-[15px] font-medium text-tinta">{titulo}</p> : null}
      <p className="mt-1 max-w-sm text-sm text-tenue">{children}</p>
    </div>
  );
}

/**
 * Menú de tres puntos sin JavaScript: un <details> que se abre y se cierra.
 * `children` son los renglones (links o formularios con botón).
 */
export function MenuAcciones({
  children,
  etiqueta = "Acciones",
}: {
  children: ReactNode;
  etiqueta?: string;
}) {
  return (
    <details className="group relative">
      <summary
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-tinta group-open:bg-slate-100 group-open:text-tinta"
        aria-label={etiqueta}
        title={etiqueta}
      >
        <Ellipsis className="h-4 w-4" strokeWidth={1.75} />
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-linea bg-white p-1 shadow-flotante">
        {children}
      </div>
    </details>
  );
}

/** Clase de cada renglón dentro de MenuAcciones. */
export const OPCION_MENU =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-tinta hover:bg-slate-50";

// ---------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------

/**
 * Estilo único de los campos. Estaba copiado como cadena suelta en 7 archivos
 * —uno de ellos cuatro veces— así que cualquier ajuste visual había que
 * repetirlo a mano en todos.
 */
export const CLASE_CAMPO =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-tinta " +
  "placeholder:text-slate-400 transition-colors " +
  "focus:border-brick-600 focus:outline-none focus:ring-4 focus:ring-brick-600/10";

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
      <span className="font-medium text-tenue">{etiqueta}</span>
      {children}
      {nota ? <span className="mt-1 block text-slate-400">{nota}</span> : null}
    </label>
  );
}

/** Mensaje de error de un formulario, con el mismo aspecto en toda la app. */
export function ErrorCampo({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-600/10">
      {children}
    </p>
  );
}

/** Confirmación breve tras guardar. */
export function Exito({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-emerald-700">{children}</p>;
}
