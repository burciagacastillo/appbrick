import Link from "next/link";
import { Bath, BedDouble, Building2, MapPin, Ruler } from "lucide-react";
import { Barra, EtapaBadge } from "./ui";
import { mxn } from "@/lib/constants";
import type { PropiedadListada } from "@/lib/queries";

// Tarjeta tipo galería para la vista INTERNA de propiedades. Enseña dinero
// (margen, gastado): nunca usarla en una página pública — para eso está la
// ficha del catálogo, que sale de la lista blanca de publico.ts.

function numero(n: number) {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("es-MX", { maximumFractionDigits: 1 });
}

export function TarjetaPropiedad({
  p,
  fotoId,
}: {
  p: PropiedadListada;
  /** La portada, si la casa tiene fotos. */
  fotoId?: string;
}) {
  const precio = p.precioPublico ?? p.valorVentaEstimado;
  const metros = p.m2Construccion ?? p.m2Terreno;
  const caracteristicas = [
    p.recamaras != null ? { icono: BedDouble, texto: numero(p.recamaras), titulo: "Recámaras" } : null,
    p.banos != null ? { icono: Bath, texto: numero(p.banos), titulo: "Baños" } : null,
    metros != null ? { icono: Ruler, texto: `${numero(metros)} m²`, titulo: "Metros" } : null,
  ].filter((c) => c !== null);
  const margenNegativo = p.dinero.margen != null && p.dinero.margen < 0;

  return (
    <Link
      href={`/propiedades/${encodeURIComponent(p.id)}`}
      className="group block rounded-tarjeta bg-white p-3 shadow-suave ring-1 ring-black/[0.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-flotante"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
        {fotoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/foto/${fotoId}`}
            alt={p.nombre}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Building2 className="h-8 w-8" strokeWidth={1.25} />
              <span className="text-xs">Sin fotos todavía</span>
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3 rounded-full bg-white/90 p-0.5 backdrop-blur">
          <EtapaBadge id={p.etapa} />
        </div>
      </div>

      <div className="px-2 pt-4 pb-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold tracking-tight">{p.nombre}</h3>
          {p.direccion ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-tenue">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{p.direccion}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-3 text-2xl font-bold tracking-tight tabular">
          {precio != null ? mxn(precio) : <span className="text-base font-medium text-slate-400">Sin precio</span>}
        </div>

        {caracteristicas.length > 0 ? (
          <div className="mt-2 flex items-center gap-4 text-sm text-tenue">
            {caracteristicas.map(({ icono: Icono, texto, titulo }) => (
              <span key={titulo} className="flex items-center gap-1.5" title={titulo}>
                <Icono className="h-4 w-4" strokeWidth={1.6} />
                <span className="tabular">{texto}</span>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between text-xs">
            <span className="text-tenue">Expediente</span>
            <span className="font-medium tabular">
              {p.progreso.completos}/{p.progreso.total}
            </span>
          </div>
          <Barra porcentaje={p.progreso.porcentaje} />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-tenue">
          <span>
            Gastado <span className="font-medium text-tinta tabular">{mxn(p.dinero.gastado)}</span>
          </span>
          <span>
            Margen{" "}
            <span className={`font-medium tabular ${margenNegativo ? "text-rose-600" : "text-tinta"}`}>
              {mxn(p.dinero.margen)}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
