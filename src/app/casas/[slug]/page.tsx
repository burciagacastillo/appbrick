import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { aFichaPublica, linkWhatsApp, WHATSAPP_GRUPO_BRICK } from "@/lib/publico";
import { mxn } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/casas/[slug]">) {
  const { slug } = await params;
  const propiedad = await db.propiedad.findUnique({
    where: { slugPublico: slug },
    include: { fotos: true },
  });
  const f = propiedad ? aFichaPublica(propiedad) : null;
  if (!f) return { title: "Grupo Brick" };

  return {
    title: `${f.titulo} — Grupo Brick`,
    description:
      f.descripcion ??
      `${f.titulo} en ${f.colonia ?? f.ciudad}. ${
        f.aceptaInfonavit ? "Acepta crédito Infonavit." : ""
      }`,
  };
}

export default async function FichaCasa({ params }: PageProps<"/casas/[slug]">) {
  const { slug } = await params;

  const propiedad = await db.propiedad.findUnique({
    where: { slugPublico: slug },
    include: { fotos: true },
  });

  // aFichaPublica devuelve null si no está publicada: una casa despublicada
  // deja de existir para el mundo aunque alguien tenga el link guardado.
  const f = propiedad ? aFichaPublica(propiedad) : null;
  if (!f) notFound();

  const datos = [
    f.recamaras != null ? { etiqueta: "Recámaras", valor: String(f.recamaras) } : null,
    f.banos != null ? { etiqueta: "Baños", valor: String(f.banos) } : null,
    f.m2Construccion != null
      ? { etiqueta: "Construcción", valor: `${f.m2Construccion} m²` }
      : null,
    f.m2Terreno != null ? { etiqueta: "Terreno", valor: `${f.m2Terreno} m²` } : null,
    f.cochera != null ? { etiqueta: "Cochera", valor: `${f.cochera} auto(s)` } : null,
  ].filter((d): d is { etiqueta: string; valor: string } => d !== null);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-linea/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-5">
          <Link href="/casas" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-brick-800 text-sm font-bold text-gold-400">
              B
            </span>
            Grupo Brick
          </Link>
          <Link href="/casas" className="text-sm font-medium text-tenue transition-colors hover:text-tinta">
            Ver todas
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {/* Fotos */}
        {f.fotos.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {f.fotos.map((foto, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={foto.url}
                src={foto.url}
                alt={foto.alt}
                className={`w-full rounded-2xl object-cover ${
                  i === 0 ? "aspect-[16/10] sm:col-span-2" : "aspect-[4/3]"
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="grid aspect-[16/9] place-items-center rounded-2xl bg-slate-100 text-sm text-slate-400">
            Sin fotos todavía
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] leading-tight font-bold tracking-tight">{f.titulo}</h1>
              {f.vendida ? (
                <span className="rounded-full bg-tinta px-3 py-1 text-xs font-semibold text-white">
                  Vendida
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-slate-500">
              {[f.colonia, f.ciudad].filter(Boolean).join(", ")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[28px] leading-tight font-bold tracking-tight tabular">
              {f.precio != null
                ? mxn(f.precio)
                : f.vendida
                  ? "Vendida"
                  : "Consultar precio"}
            </p>
            {!f.vendida && (f.aceptaInfonavit || f.aceptaBancario) ? (
              <p className="text-sm font-medium text-emerald-700">
                Acepta{" "}
                {[
                  f.aceptaInfonavit ? "Infonavit" : null,
                  f.aceptaBancario ? "crédito bancario" : null,
                ]
                  .filter(Boolean)
                  .join(" y ")}
              </p>
            ) : null}
          </div>
        </div>

        {datos.length > 0 ? (
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {datos.map((d) => (
              <div
                key={d.etiqueta}
                className="rounded-2xl bg-white px-4 py-3 shadow-suave ring-1 ring-black/[0.03]"
              >
                <dt className="text-xs text-slate-500">{d.etiqueta}</dt>
                <dd className="mt-0.5 font-semibold tabular">{d.valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {f.descripcion ? (
          <div className="mt-6 rounded-tarjeta bg-white shadow-suave ring-1 ring-black/[0.03] p-6">
            <p className="whitespace-pre-wrap leading-relaxed">{f.descripcion}</p>
          </div>
        ) : null}

        {/* El botón que pediste: abre WhatsApp con la casa ya mencionada */}
        <div className="mt-6 rounded-tarjeta bg-white shadow-suave ring-1 ring-black/[0.03] p-6 text-center">
          {f.vendida ? (
            <>
              <p className="font-medium">Esta casa ya se vendió</p>
              <p className="mt-1 text-sm text-slate-500">
                Pero tenemos otras parecidas. Escríbenos y te mandamos opciones.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_GRUPO_BRICK}?text=${encodeURIComponent(
                  `Hola, vi que ${f.titulo} ya se vendió. ¿Tienen algo parecido?`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Ver qué más tienen
              </a>
            </>
          ) : (
            <>
              <p className="font-medium">¿Te interesa esta casa?</p>
              <p className="mt-1 text-sm text-slate-500">
                Escríbenos y te decimos si calificas para el crédito. Sin
                compromiso.
              </p>
              <a
                href={linkWhatsApp(f)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Preguntar por WhatsApp
              </a>
              <p className="mt-2 text-xs text-slate-500">614 496 7308</p>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-linea py-8 text-center text-xs text-slate-500">
        Grupo Brick · Chihuahua, Chih.
      </footer>
    </div>
  );
}
