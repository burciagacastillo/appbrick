import { describe, it, expect } from "vitest";
import { escanearCarpeta, parsearArchivo } from "./escaner";

// El escáner traduce los nombres de archivo de las carpetas al estado del
// expediente. Cada prueba de abajo corresponde a un bug real que ya ocurrió:
// son regresiones, no ejercicios.

/** Los municipales: los únicos donde a/b/c significa doc/orden/pago. */
const MUNICIPALES = new Set([20, 21, 22, 23, 24]);

describe("parsearArchivo", () => {
  it("lee número, subtipo y descripción", () => {
    const p = parsearArchivo("21a - Constancia de zonificacion.pdf");
    expect(p?.numero).toBe(21);
    expect(p?.sub).toBe("a");
  });

  it("acepta un número sin subtipo", () => {
    expect(parsearArchivo("8 - INE Edgar.pdf")?.numero).toBe(8);
    expect(parsearArchivo("8 - INE Edgar.pdf")?.sub).toBeUndefined();
  });

  it("NO confunde una fecha con un número de trámite", () => {
    // Bug real: "2026-08-31_Estado de cuenta.pdf" se leía como trámite 202.
    expect(parsearArchivo("2026-08-31_Estado de cuenta (1).pdf")).toBeNull();
  });

  it("ignora números fuera del catálogo", () => {
    expect(parsearArchivo("500 - lo que sea.pdf")).toBeNull();
  });

  it("marca como dudoso lo que trae (revisar)", () => {
    expect(parsearArchivo("10 - (revisar) RFC VICENTE.pdf")?.dudoso).toBe(true);
  });

  it("detecta los archivos que piden ignorarse", () => {
    expect(parsearArchivo("95 - (archivo de prueba, ignorar) x.txt")?.ignorar).toBe(true);
  });

  it("exige el guion con espacios de ambos lados", () => {
    expect(parsearArchivo("21-Constancia.pdf")).toBeNull();
  });
});

describe("escanearCarpeta — ciclo de pago", () => {
  it("en los municipales, b es orden de cobro y c es el pago", () => {
    const r = escanearCarpeta(
      [
        "21a - Constancia de zonificacion.pdf",
        "21b - Orden de cobro.pdf",
        "21c - Comprobante de pago.pdf",
      ],
      MUNICIPALES
    );
    const t = r.tramites.find((x) => x.numero === 21)!;
    expect(t.docRecibido).toBe(true);
    expect(t.ordenDeCobro).toBe(true);
    expect(t.pagoComprobado).toBe(true);
    expect(t.estado).toBe("completo");
  });

  it("avisa cuando hay orden de cobro sin comprobante", () => {
    const r = escanearCarpeta(
      ["20a - No oficial.pdf", "20b - Orden de cobro.pdf"],
      MUNICIPALES
    );
    const t = r.tramites.find((x) => x.numero === 20)!;
    expect(t.ordenDeCobro).toBe(true);
    expect(t.pagoComprobado).toBe(false);
  });

  it("FUERA de los municipales, b NO es una orden de cobro", () => {
    // Bug real: en el 30, "30b" es la carátula de la escritura, y el trámite
    // aparecía con "falta el comprobante de pago" sin que hubiera pago alguno.
    const r = escanearCarpeta(
      ["30a - Escritura.pdf", "30b - Escritura caratula.pdf"],
      MUNICIPALES
    );
    const t = r.tramites.find((x) => x.numero === 30)!;
    expect(t.docRecibido).toBe(true);
    expect(t.ordenDeCobro).toBe(false);
    expect(t.pagoComprobado).toBe(false);
    expect(t.estado).toBe("completo");
  });
});

describe("escanearCarpeta — clasificación", () => {
  it("baja a revisar lo que trae marca de duda", () => {
    const r = escanearCarpeta(["16 - (revisar) ATSA.pdf"]);
    expect(r.tramites[0].estado).toBe("revisar");
    expect(r.tramites[0].notas).toContain("revisión");
  });

  it("no inventa trámites: lo que no tiene archivo no aparece", () => {
    const r = escanearCarpeta(["8 - INE.pdf"]);
    expect(r.tramites).toHaveLength(1);
  });

  it("separa los extras 90-99 del checklist", () => {
    const r = escanearCarpeta(["91 - Contrato.docx", "8 - INE.pdf"]);
    expect(r.tramites).toHaveLength(1);
    expect(r.extras).toHaveLength(1);
  });

  it("junta los archivos sin numerar para poder avisar", () => {
    const r = escanearCarpeta(["ine jona.pdf", "cfe jona.pdf", "8 - INE.pdf"]);
    expect(r.sinClasificar).toHaveLength(2);
  });

  it("aparta los que piden ignorarse", () => {
    const r = escanearCarpeta(["95 - (archivo de prueba, ignorar) x.txt"]);
    expect(r.ignorados).toHaveLength(1);
    expect(r.tramites).toHaveLength(0);
  });

  it("no revienta con una carpeta vacía", () => {
    const r = escanearCarpeta([]);
    expect(r.tramites).toHaveLength(0);
    expect(r.sinClasificar).toHaveLength(0);
  });
});

describe("escanearCarpeta — el caso real de Sierra la Escondida", () => {
  // Reproduce la carpeta de verdad. El resultado debe coincidir con el
  // checklist que Erick ya tenía hecho a mano en Word: 7 completos, 4 a revisar.
  const ARCHIVOS = [
    "10 - (revisar, ¿quien es Vicente) RFC VICENTE.pdf",
    "16 - (revisar) ATSA Sierra la escondida.pdf",
    "17 - (revisar) inscripcion de registro la escondida.pdf",
    "20a - No oficial Sierra la escondida.pdf",
    "20b - Orden de cobro numero oficial Sierra la Escondida.pdf",
    "21a - Constancia de zonificacion Sierra la Escondida.pdf",
    "21b - Orden de cobro zonificacion Sierra la Escondida.pdf",
    "21c - Comprobante pago zonificacion Sierra la Escondida.pdf",
    "23a - Cedula catastral Sierra la Escondida.pdf",
    "23b - Orden de cobro cedula catastral Sierra la Escondida.pdf",
    "23c - Comprobante pago cedula catastral Sierra la Escondida.pdf",
    "25 - RECIBO AGUA F298917.pdf",
    "26 - RECIBO LUZ 581100102059.pdf",
    "29 - (revisar) sierra azul planoo.pdf",
    "30a - Escritura sierra la escondida.pdf",
    "30b - Escritura sierra la escondida caratula.pdf",
    "33a - ConstanciaCursoSaberMas Edgar.pdf",
    "33b - ConstanciaCursoSaberMas Maira.pdf",
    "2026-08-31_Estado de cuenta (1).pdf",
    "CURP Edgar Gedeon Vazquez Alvarado.pdf",
  ];

  const r = escanearCarpeta(ARCHIVOS, MUNICIPALES);

  it("coincide con el checklist hecho a mano", () => {
    const completos = r.tramites.filter((t) => t.estado === "completo").length;
    const revisar = r.tramites.filter((t) => t.estado === "revisar").length;
    expect(completos).toBe(7);
    expect(revisar).toBe(4);
  });

  it("detecta los archivos sin numerar", () => {
    expect(r.sinClasificar).toContain("CURP Edgar Gedeon Vazquez Alvarado.pdf");
    expect(r.sinClasificar).toContain("2026-08-31_Estado de cuenta (1).pdf");
  });

  it("el 20 queda marcado como pagado sin comprobante", () => {
    const t = r.tramites.find((x) => x.numero === 20)!;
    expect(t.ordenDeCobro && !t.pagoComprobado).toBe(true);
  });

  it("el 30 NO queda marcado como pagado sin comprobante", () => {
    const t = r.tramites.find((x) => x.numero === 30)!;
    expect(t.ordenDeCobro).toBe(false);
  });
});
