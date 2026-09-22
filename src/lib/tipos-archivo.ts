// Identificación de archivos por su CONTENIDO, no por lo que declara quien
// los sube.
//
// POR QUÉ EXISTE ESTE ARCHIVO: el `type` de un File lo pone el navegador del
// que sube, y un atacante lo controla por completo. Puede mandar un .html con
// JavaScript diciendo que es image/jpeg. Como los documentos se sirven con
// Content-Disposition: inline, ese script correría en nuestro origen y con la
// cookie de sesión del administrador — la misma que descifra contraseñas de
// Infonavit. Por eso aquí se leen los primeros bytes del archivo.

export type TipoSeguro =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf";

type Firma = {
  tipo: TipoSeguro;
  extension: string;
  /** Bytes que deben estar al inicio. null = cualquier byte en esa posición. */
  bytes: (number | null)[];
  /** Algunos formatos necesitan una segunda comprobación más adentro. */
  verificaExtra?: (contenido: Buffer) => boolean;
};

const FIRMAS: Firma[] = [
  {
    tipo: "image/jpeg",
    extension: ".jpg",
    bytes: [0xff, 0xd8, 0xff],
  },
  {
    tipo: "image/png",
    extension: ".png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    tipo: "image/webp",
    extension: ".webp",
    // "RIFF" + 4 bytes de tamaño + "WEBP"
    bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  },
  {
    tipo: "application/pdf",
    extension: ".pdf",
    bytes: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
];

/**
 * Devuelve el tipo real del archivo según sus bytes, o null si no es ninguno
 * de los que aceptamos. Un .exe, un .html o un .zip renombrado caen aquí.
 */
export function tipoReal(
  contenido: Buffer
): { tipo: TipoSeguro; extension: string } | null {
  for (const firma of FIRMAS) {
    if (contenido.length < firma.bytes.length) continue;

    const coincide = firma.bytes.every(
      (b, i) => b === null || contenido[i] === b
    );
    if (!coincide) continue;
    if (firma.verificaExtra && !firma.verificaExtra(contenido)) continue;

    return { tipo: firma.tipo, extension: firma.extension };
  }
  return null;
}

/**
 * Al SERVIR un archivo tampoco se confía en lo que quedó guardado: si algo se
 * coló antes de que existiera esta validación, no se convierte en ejecución.
 * Cualquier valor desconocido se degrada a descarga binaria.
 */
export function tipoParaServir(guardado: string): {
  contentType: string;
  forzarDescarga: boolean;
} {
  const permitidos: TipoSeguro[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if ((permitidos as string[]).includes(guardado)) {
    return { contentType: guardado, forzarDescarga: false };
  }
  return { contentType: "application/octet-stream", forzarDescarga: true };
}

/** Solo estos se pueden usar como foto del catálogo público. */
export function esImagen(tipo: TipoSeguro): boolean {
  return tipo !== "application/pdf";
}
