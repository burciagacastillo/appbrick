import { describe, it, expect } from "vitest";
import { CATALOGO } from "../../prisma/catalogo";
import { buscarEnExpediente, normalizar, type ItemBuscable } from "./buscar-expediente";

// El buscador de la propiedad, con los nombres REALES del catálogo y escrito
// como lo escribe Erick: sin acentos, en plural, a medias o con un número.

const ITEMS: ItemBuscable[] = CATALOGO.map((c) => ({
  id: `t${c.numero}`,
  numero: c.numero,
  nombre: c.nombre,
  estado: "falta",
  esDato: Boolean(c.esDato),
  documentos: [],
}));

const primero = (texto: string) => buscarEnExpediente(ITEMS, texto)[0]?.numero;

describe("buscador del expediente", () => {
  it("encuentra por un pedazo de palabra", () => {
    expect(primero("zoni")).toBe(21);
    expect(primero("predial")).toBe(27);
  });

  it("no le importan los acentos ni el plural", () => {
    expect(primero("constancias de zonificacion")).toBe(21);
    expect(primero("CONSTANCIA DE ZONIFICACIÓN")).toBe(21);
  });

  it("busca por número de trámite", () => {
    expect(primero("30")).toBe(30);
  });

  it("'INE' encuentra las del comprador y el vendedor", () => {
    const numeros = buscarEnExpediente(ITEMS, "ine").map((r) => r.numero);
    expect(numeros).toEqual(expect.arrayContaining([2, 8, 12]));
  });

  it("palabras de relleno como 'de' no traen todo el catálogo", () => {
    expect(buscarEnExpediente(ITEMS, "de")).toEqual([]);
  });

  it("sin texto no enseña nada", () => {
    expect(buscarEnExpediente(ITEMS, "   ")).toEqual([]);
  });

  it("nunca más de 8 resultados", () => {
    expect(buscarEnExpediente(ITEMS, "recibo acta ine curp rfc solicitud").length).toBeLessThanOrEqual(8);
  });
});

describe("normalizar", () => {
  it("quita acentos y la tilde de la ñ", () => {
    expect(normalizar("Zonificación Añejo")).toBe("zonificacion anejo");
  });
});

describe("catálogo", () => {
  it("'Bonificación' ya no existe: era un error de dictado", () => {
    expect(CATALOGO.find((c) => c.nombre === "Bonificación")).toBeUndefined();
    expect(primero("bonificacion")).toBeUndefined();
  });

  it("del 34 al 42 son los del cónyuge, y no hay números repetidos", () => {
    expect(CATALOGO).toHaveLength(42);
    expect(new Set(CATALOGO.map((c) => c.numero)).size).toBe(42);
    expect(CATALOGO.filter((c) => c.numero >= 34).every((c) => c.loSubeInvitado)).toBe(true);
  });

  it("'conyuge' encuentra los documentos del cónyuge", () => {
    const numeros = buscarEnExpediente(ITEMS, "conyuge").map((r) => r.numero);
    expect(numeros).toEqual(expect.arrayContaining([34, 35, 36, 37, 39, 40, 41, 42]));
  });
});
