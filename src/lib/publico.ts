import type { Propiedad, Foto } from "@prisma/client";

// La única puerta hacia el catálogo público.
//
// POR QUÉ EXISTE ESTE ARCHIVO: una Propiedad carga al mismo tiempo el precio
// de venta (público) y tu costo, tu margen y los datos del comprador
// (confidencial). Si las páginas públicas recibieran el objeto completo,
// bastaría un `{JSON.stringify(propiedad)}` olvidado —o un campo nuevo que
// alguien agregue el año que entra— para publicar tus márgenes en internet.
//
// Aquí se ENUMERA lo que puede salir. Lo que no esté escrito abajo no sale,
// aunque se agregue al modelo después. Es una lista blanca, no una negra:
// el descuido se vuelve "falta un campo", nunca "se filtró un campo".

/** Lo único que ve alguien sin sesión. */
export type FichaPublica = {
  slug: string;
  titulo: string;
  descripcion: string | null;
  colonia: string | null;
  ciudad: string;
  tipo: string;
  /** null cuando está vendida y decidiste no mostrar el precio. */
  precio: number | null;
  vendida: boolean;
  recamaras: number | null;
  banos: number | null;
  m2Terreno: number | null;
  m2Construccion: number | null;
  cochera: number | null;
  aceptaInfonavit: boolean;
  aceptaBancario: boolean;
  destacada: boolean;
  fotos: { url: string; alt: string }[];
};

type ConFotos = Propiedad & { fotos: Foto[] };

const ETAPAS_VENDIDA = new Set(["concluida"]);

/**
 * Convierte una Propiedad en su ficha pública. Devuelve null si no debe
 * verse: sin `publicada`, sin slug o sin título no hay página que mostrar.
 */
export function aFichaPublica(p: ConFotos): FichaPublica | null {
  if (!p.publicada) return null;
  if (!p.slugPublico) return null;

  const vendida = ETAPAS_VENDIDA.has(p.etapa);

  const fotos = [...p.fotos]
    .sort((a, b) => Number(b.esPortada) - Number(a.esPortada) || a.orden - b.orden)
    .map((f) => ({
      url: `/api/foto/${f.id}`,
      // El título público manda sobre el alt guardado, y NUNCA se cae al
      // nombre interno: propiedades como "Nueva Fe (Jonathan)" publicarían
      // el nombre del vendedor en el HTML.
      alt: p.tituloPublico ?? f.alt ?? "Casa en venta",
    }));

  return {
    slug: p.slugPublico,
    titulo: p.tituloPublico ?? p.nombre,
    descripcion: p.descripcionPublica,
    colonia: p.colonia,
    ciudad: p.ciudad,
    tipo: p.tipo,
    // El precio se calla si está vendida y así lo decidiste.
    precio: p.mostrarPrecio ? p.precioPublico : null,
    vendida,
    recamaras: p.recamaras,
    banos: p.banos,
    m2Terreno: p.m2Terreno,
    m2Construccion: p.m2Construccion,
    cochera: p.cochera,
    aceptaInfonavit: p.aceptaInfonavit,
    aceptaBancario: p.aceptaBancario,
    destacada: p.destacada,
    fotos,
  };
}

export function aFichasPublicas(props: ConFotos[]): FichaPublica[] {
  return props
    .map(aFichaPublica)
    .filter((f): f is FichaPublica => f !== null)
    .sort(
      (a, b) =>
        Number(b.destacada) - Number(a.destacada) ||
        Number(a.vendida) - Number(b.vendida)
    );
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/** El número que aparece en tus listados de Marketplace. */
export const WHATSAPP_GRUPO_BRICK =
  process.env.NEXT_PUBLIC_WHATSAPP ?? "526144967308";

/**
 * Link de WhatsApp con el mensaje ya escrito. Sin API ni trámites con Meta:
 * abre la conversación con el texto listo para enviar.
 *
 * El mensaje nombra la propiedad a propósito — así sabes de cuál casa te
 * escriben, y es lo que más adelante le va a dar contexto al chatbot.
 */
export function linkWhatsApp(ficha: Pick<FichaPublica, "titulo">): string {
  const texto = `Hola, me interesa la propiedad "${ficha.titulo}" que vi en su sitio. ¿Me puede dar más información?`;
  return `https://wa.me/${WHATSAPP_GRUPO_BRICK}?text=${encodeURIComponent(texto)}`;
}

/**
 * Ficha en texto plano, para alimentar al chatbot cuando llegue la fase 2.
 * Se genera del mismo objeto público, así que el bot nunca puede contestar
 * con un dato confidencial: no lo tiene.
 */
export function fichaParaBot(f: FichaPublica): string {
  const lineas = [
    `Propiedad: ${f.titulo}`,
    f.colonia ? `Ubicación: ${f.colonia}, ${f.ciudad}` : `Ubicación: ${f.ciudad}`,
    f.vendida
      ? "Estado: VENDIDA (ya no está disponible)"
      : "Estado: Disponible",
    f.precio != null ? `Precio: $${f.precio.toLocaleString("es-MX")} MXN` : null,
    f.recamaras != null ? `Recámaras: ${f.recamaras}` : null,
    f.banos != null ? `Baños: ${f.banos}` : null,
    f.m2Terreno != null ? `Terreno: ${f.m2Terreno} m²` : null,
    f.m2Construccion != null ? `Construcción: ${f.m2Construccion} m²` : null,
    f.cochera != null ? `Cochera: ${f.cochera} auto(s)` : null,
    `Créditos aceptados: ${[
      f.aceptaInfonavit ? "Infonavit" : null,
      f.aceptaBancario ? "Bancario" : null,
    ]
      .filter(Boolean)
      .join(", ") || "Solo contado"}`,
    f.descripcion ? `Descripción: ${f.descripcion}` : null,
  ];
  return lineas.filter(Boolean).join("\n");
}
