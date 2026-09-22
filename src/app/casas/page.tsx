import Link from "next/link";
import { db } from "@/lib/db";
import { aFichasPublicas, WHATSAPP_GRUPO_BRICK } from "@/lib/publico";
import { mxn } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Casas en Chihuahua — Grupo Brick",
  description:
    "Casas en venta en Chihuahua, Aldama y Santa Eulalia. Aceptamos crédito Infonavit y bancario.",
};

// Catálogo público. Sin sesión, sin datos internos.
//
// Todo lo que se pinta aquí pasó por aFichasPublicas(), que es una lista
// blanca de campos. Nunca leer propiedad.valorCompra ni nada parecido en este
// árbol de archivos: si algún día hace falta un dato nuevo, se agrega a la
// lista blanca a conciencia, no de pasada.

function Ficha({
  f,
}: {
  f: ReturnType<typeof aFichasPublicas>[number];
}) {
  const portada = f.fotos[0];

  return (
    <Link href={`/casas/${f.slug}`} className="group block">
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lg dark:border-brick-700 dark:bg-brick-900">
        <div className="relative aspect-[4/3] bg-slate-100 dark:bg-brick-800">
          {portada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portada.url}
              alt={portada.alt}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-400">
              Sin fotos todavía
            </div>
          )}

          {f.vendida ? (
            <div className="absolute left-3 top-3 rounded-full bg-brick-800 px-3 py-1 text-xs font-semibold text-white">
              Vendida
            </div>
          ) : f.destacada ? (
            <div className="absolute left-3 top-3 rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold text-brick-900">
              Destacada
            </div>
          ) : null}
        </div>

        <div className="p-4">
          <h2 className="font-semibold tracking-tight">{f.titulo}</h2>
          {f.colonia ? (
            <p className="text-sm text-slate-500">
              {f.colonia}, {f.ciudad}
            </p>
          ) : (
            <p className="text-sm text-slate-500">{f.ciudad}</p>
          )}

          <p className="mt-2 text-lg font-semibold tabular">
            {f.precio != null ? mxn(f.precio) : f.vendida ? "Vendida" : "Consultar precio"}
          </p>

          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {f.recamaras != null ? <dd>{f.recamaras} rec</dd> : null}
            {f.banos != null ? <dd>{f.banos} baños</dd> : null}
            {f.m2Construccion != null ? <dd>{f.m2Construccion} m² const.</dd> : null}
            {f.m2Terreno != null ? <dd>{f.m2Terreno} m² terreno</dd> : null}
          </dl>

          {!f.vendida && (f.aceptaInfonavit || f.aceptaBancario) ? (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              ✓ Acepta{" "}
              {[f.aceptaInfonavit ? "Infonavit" : null, f.aceptaBancario ? "crédito bancario" : null]
                .filter(Boolean)
                .join(" y ")}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

export default async function Catalogo() {
  const propiedades = await db.propiedad.findMany({
    where: { publicada: true },
    include: { fotos: true },
  });

  const fichas = aFichasPublicas(propiedades);
  const disponibles = fichas.filter((f) => !f.vendida);
  const vendidas = fichas.filter((f) => f.vendida);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-brick-800 text-white dark:border-brick-700">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-500 text-sm font-bold text-brick-900">
                B
              </span>
              <span className="text-lg font-semibold tracking-tight">Grupo Brick</span>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_GRUPO_BRICK}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-700"
            >
              WhatsApp
            </a>
          </div>
          <p className="mt-4 max-w-xl text-sm text-brick-100">
            Casas en Chihuahua, Aldama y Santa Eulalia. Te acompañamos en todo el
            trámite de tu crédito Infonavit, de principio a fin.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {fichas.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-16 text-center dark:border-brick-700 dark:bg-brick-900">
            <p className="text-sm text-slate-500">
              Todavía no hay casas publicadas.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_GRUPO_BRICK}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Escríbenos por WhatsApp
            </a>
          </div>
        ) : (
          <>
            {disponibles.length > 0 ? (
              <section>
                <h1 className="text-lg font-semibold tracking-tight">Disponibles</h1>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {disponibles.map((f) => (
                    <Ficha key={f.slug} f={f} />
                  ))}
                </div>
              </section>
            ) : null}

            {vendidas.length > 0 ? (
              <section className="mt-12">
                <h2 className="text-lg font-semibold tracking-tight">Ya vendidas</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Casas que ya entregamos. {vendidas.length}{" "}
                  {vendidas.length === 1 ? "familia" : "familias"} en su casa propia.
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {vendidas.map((f) => (
                    <Ficha key={f.slug} f={f} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-brick-700">
        Grupo Brick · Chihuahua, Chih. · 614 496 7308
      </footer>
    </div>
  );
}
