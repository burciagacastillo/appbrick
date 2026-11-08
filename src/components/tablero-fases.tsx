"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { cambiarEtapa } from "@/acciones/propiedades";
import { ETAPAS } from "@/lib/constants";

// Propiedades → Por fase: columnas por fase, como un tablero de Trello o
// Monday. Arrastrar una tarjeta a otra columna la cambia de fase (la misma
// acción que la línea de fases, con su bitácora). En el celular no se puede
// arrastrar: cada tarjeta trae un selector "Mover a…".
//
// Recibe solo lo que pinta. Nada de dinero ni de personas: todo lo que llega
// a un componente de cliente viaja al navegador.

export type TarjetaFase = {
  id: string;
  nombre: string;
  etapa: string;
  externa: boolean;
  porcentaje: number;
  revisar: number;
  /** Para ordenar la columna de concluidas: lo más reciente arriba. */
  actualizado: number;
  siguiente: { titulo: string; cuando: string | null; atrasado: boolean } | null;
};

/** Concluidas se acumulan con los años: solo las más recientes. */
const MAX_CONCLUIDAS = 6;

export function TableroFases({ tarjetas }: { tarjetas: TarjetaFase[] }) {
  const [lista, setLista] = useState(tarjetas);
  const [base, setBase] = useState(tarjetas);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  // Cuando el servidor manda la lista nueva (después de mover), manda ella.
  if (tarjetas !== base) {
    setBase(tarjetas);
    setLista(tarjetas);
  }

  function mover(id: string, etapa: string) {
    const actual = lista.find((t) => t.id === id);
    if (!actual || actual.etapa === etapa) return;
    // Se mueve en pantalla de inmediato; el servidor confirma después.
    setLista((l) => l.map((t) => (t.id === id ? { ...t, etapa, actualizado: Date.now() } : t)));
    const datos = new FormData();
    datos.set("propiedadId", id);
    datos.set("etapa", etapa);
    iniciar(async () => {
      await cambiarEtapa(datos);
    });
  }

  const columnas = ETAPAS.filter((e) => e.id !== "cancelada");

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 [scrollbar-width:thin]">
      <div className="flex items-start gap-3">
        {columnas.map((e) => {
          let items = lista.filter((t) => t.etapa === e.id);
          const total = items.length;
          if (e.id === "concluida") {
            items = [...items].sort((a, b) => b.actualizado - a.actualizado).slice(0, MAX_CONCLUIDAS);
          }
          // Columna vacía: una tira delgada (si no, el tablero mide 3 metros).
          // Mientras arrastras se abre para poder soltar ahí.
          const delgada = total === 0 && !arrastrando;

          return (
            <section
              key={e.id}
              aria-label={e.label}
              onDragOver={(ev) => {
                if (!arrastrando) return;
                ev.preventDefault();
                if (sobre !== e.id) setSobre(e.id);
              }}
              onDragLeave={(ev) => {
                if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
                  setSobre((s) => (s === e.id ? null : s));
                }
              }}
              onDrop={(ev) => {
                ev.preventDefault();
                const id = ev.dataTransfer.getData("text/plain") || arrastrando;
                if (id) mover(id, e.id);
                setArrastrando(null);
                setSobre(null);
              }}
              className={`shrink-0 rounded-2xl p-2 transition-all ${delgada ? "w-11" : "w-72"} ${
                sobre === e.id ? "bg-slate-200 ring-2 ring-tinta/20" : "bg-slate-200/50"
              }`}
            >
              {delgada ? (
                <div
                  title={`${e.label} (vacía)`}
                  className="mx-auto py-2 text-xs font-medium whitespace-nowrap text-slate-400 [writing-mode:vertical-rl]"
                >
                  {e.label}
                </div>
              ) : (
                <>
                  <header className="flex items-center justify-between px-1.5 pt-0.5 pb-2">
                    <h2 className="text-[13px] font-semibold text-tinta">{e.label}</h2>
                    <span className="rounded-full bg-white px-2 text-xs text-tenue tabular">{total}</span>
                  </header>
                  <ul className="min-h-10 space-y-2">
                    {items.map((t) => (
                      <li
                        key={t.id}
                        draggable
                        onDragStart={(ev) => {
                          ev.dataTransfer.setData("text/plain", t.id);
                          ev.dataTransfer.effectAllowed = "move";
                          setArrastrando(t.id);
                        }}
                        onDragEnd={() => {
                          setArrastrando(null);
                          setSobre(null);
                        }}
                        className={`cursor-grab rounded-xl bg-white p-3 shadow-suave ring-1 ring-black/[0.03] active:cursor-grabbing ${
                          arrastrando === t.id ? "opacity-40" : ""
                        }`}
                      >
                        <Link
                          href={`/propiedades/${encodeURIComponent(t.id)}`}
                          className="block truncate text-sm font-semibold tracking-tight hover:underline"
                        >
                          {t.nombre}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-tenue">
                          {t.externa ? (
                            <span className="rounded-full border border-slate-300 px-1.5 text-[11px]">Externa</span>
                          ) : null}
                          <span className="tabular">{t.porcentaje}% expediente</span>
                          {t.revisar > 0 ? <span className="text-amber-700">· {t.revisar} por revisar</span> : null}
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-tinta" style={{ width: `${t.porcentaje}%` }} />
                        </div>
                        {t.siguiente ? (
                          <p className={`mt-2 flex gap-1 text-xs ${t.siguiente.atrasado ? "text-rose-600" : "text-tinta"}`}>
                            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} />
                            <span className="min-w-0">
                              {t.siguiente.titulo}
                              {t.siguiente.cuando ? (
                                <span className={t.siguiente.atrasado ? "font-medium" : "text-tenue"}>
                                  {" "}
                                  · {t.siguiente.cuando}
                                </span>
                              ) : null}
                            </span>
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">Sin siguiente paso</p>
                        )}
                        <select
                          aria-label={`Mover ${t.nombre} a otra fase`}
                          value={t.etapa}
                          onChange={(ev) => mover(t.id, ev.target.value)}
                          className="mt-2 w-full cursor-pointer rounded-lg border-0 bg-slate-50 px-2 py-1 text-xs text-tenue focus:ring-1 focus:ring-slate-300"
                        >
                          {ETAPAS.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.id === t.etapa ? `Fase: ${op.label}` : `Mover a: ${op.label}`}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                  {e.id === "concluida" && total > items.length ? (
                    <Link href="/propiedades" className="mt-2 block px-1.5 text-xs text-tenue hover:text-tinta">
                      y {total - items.length} más en la galería →
                    </Link>
                  ) : null}
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
