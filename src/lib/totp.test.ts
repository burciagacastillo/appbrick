import { describe, it, expect } from "vitest";
import {
  base32,
  desdeBase32,
  codigoPara,
  generarSecreto,
  verificarCodigo,
  pasoActual,
  uriParaApp,
} from "./totp";

// Vectores oficiales del RFC 6238, apéndice B (SHA-1). Si esto pasa, los
// códigos coinciden con los de Google Authenticator y cualquier otra app.
const SECRETO_RFC = Buffer.from("12345678901234567890", "ascii");
const VECTORES: [number, string][] = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("TOTP — vectores oficiales del RFC 6238", () => {
  for (const [segundos, esperado] of VECTORES) {
    it(`t=${segundos} da ${esperado}`, () => {
      const paso = Math.floor(segundos / 30);
      expect(codigoPara(SECRETO_RFC, paso, 8)).toBe(esperado);
      // Los 6 dígitos que ves en el celular son los últimos 6 de estos 8.
      expect(codigoPara(SECRETO_RFC, paso, 6)).toBe(esperado.slice(-6));
    });
  }
});

describe("base32", () => {
  it("ida y vuelta sin perder nada", () => {
    const original = Buffer.from("Grupo Brick 2026!");
    expect(desdeBase32(base32(original)).equals(original)).toBe(true);
  });

  it("tolera espacios y minúsculas al teclearlo a mano", () => {
    const s = generarSecreto();
    const tecleado = s.toLowerCase().replace(/(.{4})/g, "$1 ");
    expect(desdeBase32(tecleado).equals(desdeBase32(s))).toBe(true);
  });

  it("el secreto generado tiene 160 bits", () => {
    expect(desdeBase32(generarSecreto()).length).toBe(20);
  });
});

describe("verificarCodigo", () => {
  const secreto = base32(SECRETO_RFC);
  const ahora = 1234567890 * 1000;
  const paso = pasoActual(ahora);
  const codigo = codigoPara(SECRETO_RFC, paso);

  it("acepta el código vigente", () => {
    expect(verificarCodigo(secreto, codigo, { ahoraMs: ahora })).toBe(paso);
  });

  it("tolera el reloj desfasado 30 segundos para cualquier lado", () => {
    expect(verificarCodigo(secreto, codigo, { ahoraMs: ahora + 30_000 })).toBe(paso);
    expect(verificarCodigo(secreto, codigo, { ahoraMs: ahora - 30_000 })).toBe(paso);
  });

  it("rechaza un código de hace más de un minuto", () => {
    expect(verificarCodigo(secreto, codigo, { ahoraMs: ahora + 90_000 })).toBeNull();
  });

  it("un código no se puede usar dos veces", () => {
    // Quien lo viera por encima de tu hombro no podría reusarlo.
    expect(
      verificarCodigo(secreto, codigo, { ahoraMs: ahora, ultimoPasoUsado: paso })
    ).toBeNull();
  });

  it("rechaza basura y códigos de largo incorrecto", () => {
    expect(verificarCodigo(secreto, "abcdef", { ahoraMs: ahora })).toBeNull();
    expect(verificarCodigo(secreto, "12345", { ahoraMs: ahora })).toBeNull();
    expect(verificarCodigo(secreto, "", { ahoraMs: ahora })).toBeNull();
  });

  it("acepta el código con espacios, como lo muestran algunas apps", () => {
    const conEspacio = `${codigo.slice(0, 3)} ${codigo.slice(3)}`;
    expect(verificarCodigo(secreto, conEspacio, { ahoraMs: ahora })).toBe(paso);
  });
});

describe("uriParaApp", () => {
  it("arma lo que entiende Google Authenticator", () => {
    const uri = uriParaApp("JBSWY3DPEHPK3PXP", "erick@x.com");
    expect(uri).toMatch(/^otpauth:\/\/totp\/AppBrick%3Aerick%40x\.com\?/);
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=AppBrick");
  });
});
