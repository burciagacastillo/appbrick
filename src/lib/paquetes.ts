import { PDFDocument } from "pdf-lib";

// Paquetes: varios documentos del expediente juntos en UN PDF, en el orden
// exacto que pide quien los recibe. El primero es el del valuador; para
// agregar otro (notaría, Infonavit…) basta con otra entrada en PAQUETES.

export type Pieza = { numero: number; etiqueta: string };

export const PAQUETES = [
  {
    id: "avaluo",
    nombre: "Avalúo",
    descripcion: "Requisitos para mandar a hacer el avalúo, en el orden que los pide el valuador.",
    piezas: [
      { numero: 16, etiqueta: "Solicitud de avalúo" },
      { numero: 8, etiqueta: "Identificación oficial del comprador" },
      { numero: 9, etiqueta: "CURP del comprador" },
      { numero: 10, etiqueta: "RFC del comprador" },
      { numero: 2, etiqueta: "Identificación oficial del vendedor" },
      { numero: 3, etiqueta: "CURP del vendedor" },
      { numero: 4, etiqueta: "RFC del vendedor" },
      { numero: 25, etiqueta: "Recibo de agua reciente" },
      { numero: 26, etiqueta: "Recibo de luz reciente" },
      { numero: 27, etiqueta: "Recibo de predial pagado" },
      { numero: 20, etiqueta: "Número oficial" },
      { numero: 29, etiqueta: "Plano catastral" },
      { numero: 30, etiqueta: "Escritura" },
      { numero: 23, etiqueta: "Cédula catastral" },
    ] satisfies Pieza[],
  },
] as const;

export type Paquete = (typeof PAQUETES)[number];

export function paquete(id: string): Paquete | undefined {
  return PAQUETES.find((p) => p.id === id);
}

/** Lo mínimo que hace falta de un trámite para armar el paquete. */
export type TramiteParaPaquete = {
  id: string;
  estado: string;
  catalogo: { numero: number; requierePago: boolean };
  documentos: {
    id: string;
    estado: string;
    subTipo: string | null;
    creadoEn: Date;
    nombreArchivo: string;
    mimeType: string;
    ruta: string;
  }[];
};

export type PiezaArmada<D> = Pieza & {
  tramiteId: string | null;
  noAplica: boolean;
  documentos: D[];
};

/**
 * Qué archivo va en cada lugar del paquete. Reglas:
 *   · Nunca un documento rechazado.
 *   · En los municipales, solo el documento (a), no la orden de cobro ni el pago.
 *   · Si hay aprobados, solo los aprobados; si no, los que esperan revisión.
 *   · Varios archivos de la misma pieza (INE de frente y de vuelta) van en el
 *     orden en que se subieron.
 */
export function armarPaquete<T extends TramiteParaPaquete>(
  p: Paquete,
  tramites: T[]
): PiezaArmada<T["documentos"][number]>[] {
  return p.piezas.map((pieza) => {
    const t = tramites.find((x) => x.catalogo.numero === pieza.numero);
    const vivos = (t?.documentos ?? []).filter(
      (d) =>
        d.estado !== "rechazado" &&
        (!t!.catalogo.requierePago || d.subTipo === null || d.subTipo === "a")
    );
    const aprobados = vivos.filter((d) => d.estado === "aprobado");
    const elegidos = (aprobados.length > 0 ? aprobados : vivos)
      .slice()
      .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime());

    return {
      ...pieza,
      tramiteId: t?.id ?? null,
      noAplica: t?.estado === "no_aplica",
      documentos: elegidos,
    };
  });
}

// Tamaño carta, en puntos (1/72 de pulgada), y un margen para las fotos.
const CARTA = { ancho: 612, alto: 792 };
const MARGEN = 28;

/**
 * Une PDFs y fotos en un solo PDF, en el orden recibido. Cada foto va en su
 * propia hoja tamaño carta, acostada o parada según la foto. Lo que no se
 * pueda leer (un PDF dañado, una foto WEBP) se reporta en `omitidos` en vez
 * de tumbar todo el paquete.
 */
export async function unirEnPdf(
  entradas: { contenido: Buffer; tipo: string; nombre: string }[]
): Promise<{ pdf: Buffer; paginas: number; omitidos: string[] }> {
  const final = await PDFDocument.create();
  const omitidos: string[] = [];

  for (const e of entradas) {
    try {
      if (e.tipo === "application/pdf") {
        const origen = await PDFDocument.load(e.contenido, { ignoreEncryption: true });
        const paginas = await final.copyPages(origen, origen.getPageIndices());
        for (const pagina of paginas) final.addPage(pagina);
      } else if (e.tipo === "image/jpeg" || e.tipo === "image/png") {
        const imagen =
          e.tipo === "image/png" ? await final.embedPng(e.contenido) : await final.embedJpg(e.contenido);
        const acostada = imagen.width > imagen.height;
        const ancho = acostada ? CARTA.alto : CARTA.ancho;
        const alto = acostada ? CARTA.ancho : CARTA.alto;
        const escala = Math.min((ancho - 2 * MARGEN) / imagen.width, (alto - 2 * MARGEN) / imagen.height, 1);
        const w = imagen.width * escala;
        const h = imagen.height * escala;
        const hoja = final.addPage([ancho, alto]);
        hoja.drawImage(imagen, { x: (ancho - w) / 2, y: (alto - h) / 2, width: w, height: h });
      } else {
        omitidos.push(e.nombre);
      }
    } catch {
      omitidos.push(e.nombre);
    }
  }

  const bytes = await final.save();
  return { pdf: Buffer.from(bytes), paginas: final.getPageCount(), omitidos };
}
