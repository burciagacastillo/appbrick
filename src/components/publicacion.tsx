"use client";

import { useActionState } from "react";
import {
  subirFotos,
  eliminarFoto,
  hacerPortada,
  guardarFichaPublica,
  type ResultadoFoto,
} from "@/acciones/publicar";

// Pestaña "Publicar" de una propiedad: lo que ve el mundo.
//
// Es componente de cliente solo por la subida de fotos — se suben varias de
// golpe desde el carrete del celular y sin aviso de progreso parece colgada.

type Foto = { id: string; archivo: string; esPortada: boolean; alt: string | null };

type Props = {
  propiedad: {
    id: string;
    nombre: string;
    publicada: boolean;
    destacada: boolean;
    slugPublico: string | null;
    tituloPublico: string | null;
    descripcionPublica: string | null;
    precioPublico: number | null;
    mostrarPrecio: boolean;
    recamaras: number | null;
    banos: number | null;
    m2Terreno: number | null;
    m2Construccion: number | null;
    cochera: number | null;
    aceptaInfonavit: boolean;
    aceptaBancario: boolean;
    fotos: Foto[];
  };
};

const input =
  "mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-brick-700 dark:bg-brick-900";

function Interruptor({
  name,
  defaultChecked,
  etiqueta,
  nota,
}: {
  name: string;
  defaultChecked: boolean;
  etiqueta: string;
  nota?: string;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-slate-300"
      />
      <span className="text-sm">
        {etiqueta}
        {nota ? <span className="block text-xs text-slate-500">{nota}</span> : null}
      </span>
    </label>
  );
}

export function Publicacion({ propiedad: p }: Props) {
  const [estadoFotos, accionFotos, subiendo] = useActionState<
    ResultadoFoto | null,
    FormData
  >(subirFotos, null);

  return (
    <div className="space-y-4">
      {/* Fotos */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-brick-700 dark:bg-brick-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-brick-700">
          <h2 className="text-sm font-semibold">Fotos</h2>
          <span className="text-xs text-slate-500">
            {p.fotos.length} {p.fotos.length === 1 ? "foto" : "fotos"}
          </span>
        </div>

        <form action={accionFotos} className="px-4 py-3">
          <input type="hidden" name="propiedadId" value={p.id} />
          <input
            type="file"
            name="fotos"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic"
            disabled={subiendo}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0
                       file:bg-brick-800 file:px-3 file:py-2 file:text-sm
                       file:font-medium file:text-white hover:file:bg-brick-700
                       disabled:opacity-50"
            onChange={(e) => {
              if (e.target.files?.length) e.target.form?.requestSubmit();
            }}
          />
          <p className="mt-1 text-xs text-slate-500">
            Puedes escoger varias de una vez. Desde el celular sale el carrete.
          </p>

          {subiendo ? (
            <p className="mt-2 text-sm text-brick-700 dark:text-gold-400">
              Subiendo fotos…
            </p>
          ) : null}
          {!subiendo && estadoFotos?.ok === true ? (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
              Se subieron {estadoFotos.cuantas}.
            </p>
          ) : null}
          {!subiendo && estadoFotos?.ok === false ? (
            <p className="mt-2 text-sm text-rose-700 dark:text-rose-400">
              {estadoFotos.error}
            </p>
          ) : null}
        </form>

        {p.fotos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4">
            {p.fotos.map((f) => (
              <div key={f.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/foto/${f.id}`}
                  alt={f.alt ?? ""}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                {f.esPortada ? (
                  <span className="absolute left-1.5 top-1.5 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-semibold text-brick-900">
                    Portada
                  </span>
                ) : null}
                <div className="mt-1 flex gap-1">
                  {!f.esPortada ? (
                    <form action={hacerPortada} className="flex-1">
                      <input type="hidden" name="fotoId" value={f.id} />
                      <button
                        type="submit"
                        className="w-full rounded border border-slate-200 px-1 py-0.5 text-[11px] hover:bg-slate-50 dark:border-brick-700 dark:hover:bg-brick-800"
                      >
                        Portada
                      </button>
                    </form>
                  ) : null}
                  <form action={eliminarFoto}>
                    <input type="hidden" name="fotoId" value={f.id} />
                    <button
                      type="submit"
                      className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-rose-600 hover:bg-rose-50 dark:border-brick-700"
                    >
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Ficha */}
      <form
        action={guardarFichaPublica}
        className="rounded-xl border border-slate-200 bg-white dark:border-brick-700 dark:bg-brick-900"
      >
        <input type="hidden" name="propiedadId" value={p.id} />

        <div className="border-b border-slate-200 px-4 py-3 dark:border-brick-700">
          <h2 className="text-sm font-semibold">Lo que ve el público</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Nada de esto toca tus costos ni tu margen. Son campos aparte.
          </p>
        </div>

        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Interruptor
              name="publicada"
              defaultChecked={p.publicada}
              etiqueta="Publicar esta casa en el catálogo"
              nota="Mientras esté apagado, nadie puede verla aunque tenga el link."
            />
            <Interruptor
              name="destacada"
              defaultChecked={p.destacada}
              etiqueta="Destacarla arriba del catálogo"
            />
          </div>

          <label className="text-xs sm:col-span-2">
            <span className="text-slate-500">Título</span>
            <input
              name="tituloPublico"
              defaultValue={p.tituloPublico ?? p.nombre}
              placeholder="Casa en Praderas del Sur"
              className={input}
            />
          </label>

          <label className="text-xs sm:col-span-2">
            <span className="text-slate-500">Descripción</span>
            <textarea
              name="descripcionPublica"
              defaultValue={p.descripcionPublica ?? ""}
              rows={4}
              placeholder="Casa remodelada, recámara ampliada, piso de concreto…"
              className={input}
            />
          </label>

          <label className="text-xs">
            <span className="text-slate-500">Precio</span>
            <input
              type="number"
              step="1"
              name="precioPublico"
              defaultValue={p.precioPublico ?? ""}
              className={`${input} tabular`}
            />
          </label>

          <div className="flex items-end pb-1">
            <Interruptor
              name="mostrarPrecio"
              defaultChecked={p.mostrarPrecio}
              etiqueta="Mostrar el precio"
              nota="Apágalo en las vendidas si no quieres enseñar en cuánto se fue."
            />
          </div>

          <label className="text-xs">
            <span className="text-slate-500">Recámaras</span>
            <input
              type="number"
              name="recamaras"
              defaultValue={p.recamaras ?? ""}
              className={`${input} tabular`}
            />
          </label>
          <label className="text-xs">
            <span className="text-slate-500">Baños</span>
            <input
              type="number"
              step="0.5"
              name="banos"
              defaultValue={p.banos ?? ""}
              className={`${input} tabular`}
            />
          </label>
          <label className="text-xs">
            <span className="text-slate-500">m² de construcción</span>
            <input
              type="number"
              step="0.01"
              name="m2Construccion"
              defaultValue={p.m2Construccion ?? ""}
              className={`${input} tabular`}
            />
          </label>
          <label className="text-xs">
            <span className="text-slate-500">m² de terreno</span>
            <input
              type="number"
              step="0.01"
              name="m2Terreno"
              defaultValue={p.m2Terreno ?? ""}
              className={`${input} tabular`}
            />
          </label>
          <label className="text-xs">
            <span className="text-slate-500">Cochera (autos)</span>
            <input
              type="number"
              name="cochera"
              defaultValue={p.cochera ?? ""}
              className={`${input} tabular`}
            />
          </label>

          <div className="flex flex-col justify-end gap-2 pb-1">
            <Interruptor
              name="aceptaInfonavit"
              defaultChecked={p.aceptaInfonavit}
              etiqueta="Acepta Infonavit"
            />
            <Interruptor
              name="aceptaBancario"
              defaultChecked={p.aceptaBancario}
              etiqueta="Acepta crédito bancario"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-brick-800 px-4 py-2 text-sm font-medium text-white hover:bg-brick-700"
            >
              Guardar
            </button>
            {p.slugPublico ? (
              <a
                href={`/casas/${p.slugPublico}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brick-700 hover:underline dark:text-gold-400"
              >
                Ver como la ve el público ↗
              </a>
            ) : (
              <span className="text-xs text-slate-500">
                Al guardar se genera su dirección pública.
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
