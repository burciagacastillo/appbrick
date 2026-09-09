// Traduce los nombres de archivo de tus carpetas al estado del expediente.
//
// Tu convención (la que ya usas, no una nueva):
//   "21a - Constancia de zonificacion Sierra la Escondida.pdf"
//    │└─ a = el documento, b = orden de cobro, c = comprobante de pago
//    └── número del catálogo (1-34)
//
// Marcas como "(revisar)" dentro del nombre bajan el trámite a estado "revisar"
// en vez de darlo por bueno. Archivos 90-99 son tus extras (contratos, planos
// CAD, etc.) que no forman parte del checklist pero no se pierden.

export type SubDoc = "a" | "b" | "c";

export type ArchivoParseado = {
  archivo: string;
  numero: number;
  sub?: SubDoc;
  descripcion: string;
  /** El nombre trae "(revisar)", "(posible duplicado)" o similar. */
  dudoso: boolean;
  /** El nombre pide explícitamente ignorarlo. */
  ignorar: boolean;
};

export type EstadoDerivado = {
  numero: number;
  estado: "falta" | "revisar" | "completo";
  docRecibido: boolean;
  ordenDeCobro: boolean;
  pagoComprobado: boolean;
  /** El archivo principal (el "a" o el que no trae sufijo). */
  archivo?: string;
  archivos: string[];
  notas?: string;
};

export type ResultadoEscaneo = {
  /** Trámites del catálogo 1-34 con estado deducido. */
  tramites: EstadoDerivado[];
  /** Archivos 90-99: tus extras fuera del checklist. */
  extras: ArchivoParseado[];
  /** Archivos que no siguen la convención de numeración. */
  sinClasificar: string[];
  /** Archivos que el propio nombre pide ignorar. */
  ignorados: string[];
};

// número + sufijo opcional + resto del token + " - " + descripción.
// El " - " con espacios de ambos lados es lo que evita que "2026-08-31_..."
// se confunda con el trámite 202.
const PATRON = /^(\d{1,3})([a-c])?\S*\s+-\s+(.+)$/;

const MARCAS_DUDA = ["(revisar", "(posible duplicado", "(versión anterior", "(version anterior"];
const MARCAS_IGNORAR = ["(archivo de prueba", "ignorar)"];

export function parsearArchivo(archivo: string): ArchivoParseado | null {
  const m = PATRON.exec(archivo.trim());
  if (!m) return null;

  const numero = Number(m[1]);
  // Solo aceptamos el catálogo (1-34) y tus extras (90-99). Cualquier otro
  // número es coincidencia (fechas, folios) y no es un trámite.
  const esCatalogo = numero >= 1 && numero <= 34;
  const esExtra = numero >= 90 && numero <= 99;
  if (!esCatalogo && !esExtra) return null;

  const bajo = archivo.toLowerCase();
  return {
    archivo,
    numero,
    sub: m[2] as SubDoc | undefined,
    descripcion: m[3],
    dudoso: MARCAS_DUDA.some((s) => bajo.includes(s)),
    ignorar: MARCAS_IGNORAR.some((s) => bajo.includes(s)),
  };
}

/**
 * Toma la lista de archivos de una carpeta y deduce el estado de cada trámite.
 * No inventa: si no hay archivo para un número, ese trámite simplemente no
 * aparece y se queda en "falta".
 *
 * `conCicloDePago` son los números donde a/b/c SÍ significa
 * documento / orden de cobro / comprobante — los municipales (20-24).
 * En los demás el sufijo es solo una parte más del mismo documento
 * (30a escritura, 30b carátula) y no debe leerse como un pago pendiente.
 */
export function escanearCarpeta(
  archivos: string[],
  conCicloDePago: ReadonlySet<number> = new Set()
): ResultadoEscaneo {
  const porNumero = new Map<number, ArchivoParseado[]>();
  const extras: ArchivoParseado[] = [];
  const sinClasificar: string[] = [];
  const ignorados: string[] = [];

  for (const archivo of archivos) {
    const p = parsearArchivo(archivo);
    if (!p) {
      sinClasificar.push(archivo);
      continue;
    }
    if (p.ignorar) {
      ignorados.push(archivo);
      continue;
    }
    if (p.numero >= 90) {
      extras.push(p);
      continue;
    }
    const lista = porNumero.get(p.numero) ?? [];
    lista.push(p);
    porNumero.set(p.numero, lista);
  }

  const tramites: EstadoDerivado[] = [];

  for (const [numero, lista] of [...porNumero.entries()].sort((a, b) => a[0] - b[0])) {
    const tieneCiclo = conCicloDePago.has(numero);
    const hayDuda = lista.some((p) => p.dudoso);

    // Sin ciclo de pago, cualquier archivo cuenta como "el documento está".
    const docRecibido = tieneCiclo
      ? lista.some((p) => p.sub === "a" || p.sub === undefined)
      : lista.length > 0;
    const ordenDeCobro = tieneCiclo && lista.some((p) => p.sub === "b");
    const pagoComprobado = tieneCiclo && lista.some((p) => p.sub === "c");

    const principal = lista.find((p) => p.sub === "a") ?? lista.find((p) => !p.sub) ?? lista[0];

    // Ojo: aquí solo va lo que NO se puede volver a deducir después.
    // El estado del ciclo de pago ("falta el comprobante") se calcula al pintar
    // la pantalla; si se guardara aquí quedaría rancio en cuanto lo resuelvas.
    const notas: string[] = [];
    if (hayDuda) {
      notas.push("El nombre del archivo trae una marca de revisión pendiente.");
    }

    tramites.push({
      numero,
      estado: hayDuda ? "revisar" : docRecibido ? "completo" : "revisar",
      docRecibido,
      ordenDeCobro,
      pagoComprobado,
      archivo: principal?.archivo,
      archivos: lista.map((p) => p.archivo),
      notas: notas.length ? notas.join(" ") : undefined,
    });
  }

  return { tramites, extras, sinClasificar, ignorados };
}
