import { describe, it, expect } from "vitest";
import { margenDe, estadoInicial, NUMEROS_AVALUO } from "./modalidad";
import { PAQUETES } from "./paquetes";
import { DOCS_CONYUGE } from "./conyuge";

// Propia o externa (pedido de Erick del 01/10/2026). Una externa (Praderas:
// asesoría y adecuaciones; la licenciada de la notaría: solo el avalúo) no
// tiene casa comprada: si se calculara como propia, el margen saldría vacío
// o, peor, inventado.

const propia = { modalidad: "propia", valorCompra: 620_000, valorVentaEstimado: 980_000, cobroCliente: null };
const externa = { modalidad: "externa", valorCompra: null, valorVentaEstimado: null, cobroCliente: 45_000 };

describe("margenDe", () => {
  it("propia: venta estimada − compra − gastos", () => {
    expect(margenDe(propia, 150_000)).toBe(210_000);
  });

  it("propia sin compra o sin venta: null, no un cero inventado", () => {
    expect(margenDe({ ...propia, valorCompra: null }, 0)).toBeNull();
    expect(margenDe({ ...propia, valorVentaEstimado: null }, 0)).toBeNull();
  });

  it("externa: lo que cobra − gastos (barandal, cementado)", () => {
    expect(margenDe(externa, 12_500)).toBe(32_500);
  });

  it("externa: ignora un valor de compra que haya quedado de antes", () => {
    expect(margenDe({ ...externa, valorCompra: 900_000, valorVentaEstimado: 1_000_000 }, 0)).toBe(45_000);
  });

  it("externa sin cobro capturado: null; y si los gastos pasan el cobro, negativa", () => {
    expect(margenDe({ ...externa, cobroCliente: null }, 5_000)).toBeNull();
    expect(margenDe(externa, 50_000)).toBe(-5_000);
  });
});

describe("estadoInicial — cómo nace el expediente", () => {
  it("completo: todo en falta menos lo del cónyuge", () => {
    for (let n = 1; n <= 42; n++) {
      const conyuge = ([...DOCS_CONYUGE.vendedor, ...DOCS_CONYUGE.comprador] as number[]).includes(n);
      expect(estadoInicial(n, "completo")).toBe(conyuge ? "no_aplica" : "falta");
    }
  });

  it("solo avalúo: abre exactamente lo que pide el valuador", () => {
    const avaluo = PAQUETES.find((p) => p.id === "avaluo")!.piezas.map((p) => p.numero);
    const abiertos = Array.from({ length: 42 }, (_, i) => i + 1).filter(
      (n) => estadoInicial(n, "avaluo") === "falta"
    );
    expect(abiertos.sort((a, b) => a - b)).toEqual([...avaluo].sort((a, b) => a - b));
  });

  it("solo avalúo: la escritura sí, el poder y el NSS no", () => {
    expect(estadoInicial(30, "avaluo")).toBe("falta");
    expect(estadoInicial(16, "avaluo")).toBe("falta");
    expect(estadoInicial(1, "avaluo")).toBe("no_aplica");
    expect(estadoInicial(13, "avaluo")).toBe("no_aplica");
  });

  it("el paquete del avalúo trae los 14 del valuador", () => {
    expect(NUMEROS_AVALUO.size).toBe(14);
  });
});
