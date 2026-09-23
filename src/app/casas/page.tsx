import Link from "next/link";
import { Bath, BedDouble, Building2, CircleCheck, MessageCircle, Ruler } from "lucide-react";
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

const BOTON_WHATSAPP =
  "inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98]";

function numero(n: number) {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-MX", { maximumFractionDigits: 1 });
}

function Ficha({
  f,
}: {
  f: ReturnType<typeof aFichasPublicas>[number];
}) {
  const portada = f.fotos[0];
  const metros = f.m2Construccion ?? f.m2Terreno;

  return (
    <Link
      href={`/casas/${f.slug}`}
      className="group block rounded-tarjeta bg-white p-3 shadow-suave ring-1 ring-black/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-flotante"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
        {portada ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portada.url}
            alt={portada.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-slate-400">
            <Building2 className="h-8 w-8" strokeWidth={1.25} />
          </div>
        )}

        {f.vendida ? (
          <div className="absolute top-3 left-3 rounded-full bg-tinta/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            Vendida
          </div>
        ) : f.destacada ? (
          <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-tinta backdrop-blur">
            Destacada
          </div>
        ) : null}
      </div>

      <div className="px-2 pt-4 pb-2">
        <h2 className="truncate font-semibold tracking-tight">{f.titulo}</h2>
        <p className="mt-0.5 truncate text-sm text-tenue">
          {f.colonia ? `${f.colonia}, ${f.ciudad}` : f.ciudad}
        </p>

        <p className="mt-3 text-2xl font-bold tracking-tight tabular">
          {f.precio != null ? (
            mxn(f.precio)
          ) : (
            <span className="text-base font-medium text-tenue">
              {f.vendida ? "Vendida" : "Consultar precio"}
            </span>
          )}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tenue">
          {f.recamaras != null ? (
            <span className="flex items-center gap-1.5" title="Recámaras">
              <BedDouble className="h-4 w-4" strokeWidth={1.6} />
              <span className="tabular">{f.recamaras}</span>
            </span>
          ) : null}
          {f.banos != null ? (
            <span className="flex items-center gap-1.5" title="Baños">
              <Bath className="h-4 w-4" strokeWidth={1.6} />
              <span className="tabular">{numero(f.banos)}</span>
            </span>
          ) : null}
          {metros != null ? (
            <span className="flex items-center gap-1.5" title="Metros cuadrados">
              <Ruler className="h-4 w-4" strokeWidth={1.6} />
              <span className="tabular">{numero(metros)} m²</span>
            </span>
          ) : null}
        </div>

        {!f.vendida && (f.aceptaInfonavit || f.aceptaBancario) ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} />
            Acepta{" "}
            {[f.aceptaInfonavit ? "Infonavit" : null, f.aceptaBancario ? "crédito bancario" : null]
              .filter(Boolean)
              .join(" y ")}
          </p>
        ) : null}
      </div>
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
      <header className="sticky top-0 z-20 border-b border-linea/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-brick-800 text-sm font-bold text-gold-400">
              B
            </span>
            <span className="font-semibold tracking-tight">Grupo Brick</span>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_GRUPO_BRICK}`}
            target="_blank"
            rel="noreferrer"
            className={BOTON_WHATSAPP}
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
            WhatsApp
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-14 pb-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            Casas en Chihuahua
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-tenue">
            En Chihuahua, Aldama y Santa Eulalia. Te acompañamos en todo el
            trámite de tu crédito Infonavit, de principio a fin.
          </p>
        </div>

        {fichas.length === 0 ? (
          <div className="mt-12 rounded-tarjeta bg-white px-6 py-16 text-center shadow-suave ring-1 ring-black/[0.03]">
            <p className="text-tenue">Todavía no hay casas publicadas.</p>
            <a
              href={`https://wa.me/${WHATSAPP_GRUPO_BRICK}`}
              target="_blank"
              rel="noreferrer"
              className={`mt-6 ${BOTON_WHATSAPP}`}
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              Escríbenos por WhatsApp
            </a>
          </div>
        ) : (
          <>
            {disponibles.length > 0 ? (
              <section className="mt-12">
                <h2 className="text-xl font-semibold tracking-tight">Disponibles</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {disponibles.map((f) => (
                    <Ficha key={f.slug} f={f} />
                  ))}
                </div>
              </section>
            ) : null}

            {vendidas.length > 0 ? (
              <section className="mt-16">
                <h2 className="text-xl font-semibold tracking-tight">Ya vendidas</h2>
                <p className="mt-1 text-sm text-tenue">
                  Casas que ya entregamos. {vendidas.length}{" "}
                  {vendidas.length === 1 ? "familia" : "familias"} en su casa propia.
                </p>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {vendidas.map((f) => (
                    <Ficha key={f.slug} f={f} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      <footer className="border-t border-linea/60 py-10 text-center text-xs text-tenue">
        Grupo Brick · Chihuahua, Chih. · 614 496 7308
      </footer>
    </div>
  );
}
