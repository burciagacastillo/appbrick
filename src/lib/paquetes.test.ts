import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { PAQUETES, armarPaquete, unirEnPdf, type TramiteParaPaquete } from "./paquetes";

// El paquete del avalúo: el valuador lo pide en un orden fijo y lo rebota si
// viene revuelto o con el documento equivocado.

const AVALUO = PAQUETES[0];

let n = 0;
function doc(estado: string, extra: Partial<TramiteParaPaquete["documentos"][number]> = {}) {
  n++;
  return {
    id: `d${n}`,
    estado,
    subTipo: null,
    creadoEn: new Date(2026, 0, n),
    nombreArchivo: `doc${n}.pdf`,
    mimeType: "application/pdf",
    ruta: `x/doc${n}.pdf`,
    ...extra,
  };
}

function tramite(
  numero: number,
  documentos: TramiteParaPaquete["documentos"],
  opciones: { requierePago?: boolean; estado?: string } = {}
): TramiteParaPaquete {
  return {
    id: `t${numero}`,
    estado: opciones.estado ?? "completo",
    catalogo: { numero, requierePago: opciones.requierePago ?? false },
    documentos,
  };
}

describe("armarPaquete — el orden y el documento correcto", () => {
  it("sigue el orden del valuador, no el del catálogo", () => {
    const numeros = armarPaquete(AVALUO, []).map((p) => p.numero);
    expect(numeros).toEqual([16, 8, 9, 10, 2, 3, 4, 25, 26, 27, 20, 29, 30, 23]);
  });

  it("marca como faltante lo que no tiene documento", () => {
    const piezas = armarPaquete(AVALUO, [tramite(8, [doc("aprobado")])]);
    expect(piezas.find((p) => p.numero === 8)?.documentos).toHaveLength(1);
    expect(piezas.find((p) => p.numero === 16)?.documentos).toHaveLength(0);
  });

  it("nunca mete un documento rechazado", () => {
    const piezas = armarPaquete(AVALUO, [tramite(9, [doc("rechazado")])]);
    expect(piezas.find((p) => p.numero === 9)?.documentos).toHaveLength(0);
  });

  it("si hay aprobado, deja fuera el que espera revisión", () => {
    const aprobado = doc("aprobado");
    const piezas = armarPaquete(AVALUO, [tramite(10, [doc("pendiente"), aprobado])]);
    expect(piezas.find((p) => p.numero === 10)?.documentos.map((d) => d.id)).toEqual([aprobado.id]);
  });

  it("sin aprobados, usa los que esperan revisión", () => {
    const piezas = armarPaquete(AVALUO, [tramite(2, [doc("pendiente")])]);
    expect(piezas.find((p) => p.numero === 2)?.documentos).toHaveLength(1);
  });

  it("en municipales solo va el documento, no la orden de cobro ni el pago", () => {
    const a = doc("aprobado", { subTipo: "a" });
    const piezas = armarPaquete(AVALUO, [
      tramite(20, [doc("aprobado", { subTipo: "b" }), a, doc("aprobado", { subTipo: "c" })], {
        requierePago: true,
      }),
    ]);
    expect(piezas.find((p) => p.numero === 20)?.documentos.map((d) => d.id)).toEqual([a.id]);
  });

  it("varias hojas de la misma pieza van en el orden en que se subieron", () => {
    const frente = doc("aprobado");
    const vuelta = doc("aprobado");
    // Llegan desordenadas; deben salir frente y luego vuelta.
    const piezas = armarPaquete(AVALUO, [tramite(8, [vuelta, frente])]);
    const ids = piezas.find((p) => p.numero === 8)?.documentos.map((d) => d.id);
    expect(ids).toEqual([frente.id, vuelta.id]);
  });

  it("respeta el 'no aplica'", () => {
    const piezas = armarPaquete(AVALUO, [tramite(26, [], { estado: "no_aplica" })]);
    expect(piezas.find((p) => p.numero === 26)?.noAplica).toBe(true);
  });
});

// Un PNG real de 1×1 y PDFs reales armados aquí mismo.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

async function pdfDeHojas(hojas: number) {
  const d = await PDFDocument.create();
  for (let i = 0; i < hojas; i++) d.addPage();
  return Buffer.from(await d.save());
}

describe("unirEnPdf", () => {
  it("junta PDFs y fotos en un solo PDF, hoja por hoja y en orden", async () => {
    const r = await unirEnPdf([
      { contenido: await pdfDeHojas(1), tipo: "application/pdf", nombre: "solicitud.pdf" },
      { contenido: PNG, tipo: "image/png", nombre: "ine.png" },
      { contenido: await pdfDeHojas(3), tipo: "application/pdf", nombre: "escritura.pdf" },
    ]);
    expect(r.omitidos).toEqual([]);
    expect(r.paginas).toBe(5);
    const leido = await PDFDocument.load(r.pdf);
    expect(leido.getPageCount()).toBe(5);
  });

  it("un archivo dañado no tumba el paquete: se reporta y se sigue", async () => {
    const r = await unirEnPdf([
      { contenido: Buffer.from("esto no es un pdf"), tipo: "application/pdf", nombre: "roto.pdf" },
      { contenido: await pdfDeHojas(2), tipo: "application/pdf", nombre: "bueno.pdf" },
      { contenido: Buffer.from("RIFF....WEBP"), tipo: "image/webp", nombre: "foto.webp" },
    ]);
    expect(r.omitidos).toEqual(["roto.pdf", "foto.webp"]);
    expect(r.paginas).toBe(2);
  });
});
