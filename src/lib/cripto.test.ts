import { describe, it, expect, beforeAll } from "vitest";
import { cifrar, descifrar, subllave, generarToken, tokensIguales, hashArchivo } from "./cripto";
import { hashearPassword, verificarPassword } from "./sesion";

// Criptografía: aquí un fallo no se ve en pantalla. Se ve el día que las
// contraseñas guardadas resultan irrecuperables, o el día que resulta que
// nunca se cifraron de verdad.

beforeAll(() => {
  process.env.APPBRICK_LLAVE_CIFRADO =
    "llave-de-prueba-suficientemente-larga-para-pasar-la-validacion";
});

describe("cifrar / descifrar", () => {
  it("lo que se cifra se recupera igual", () => {
    const secreto = "MiPassInfonavit123!";
    expect(descifrar(cifrar(secreto))).toBe(secreto);
  });

  it("el texto cifrado no contiene el original", () => {
    expect(cifrar("MiPassInfonavit123!")).not.toContain("MiPass");
  });

  it("cifrar dos veces lo mismo da resultados distintos", () => {
    // Si fueran iguales, se podría saber que dos personas usan la misma
    // contraseña con solo mirar la base.
    expect(cifrar("igual")).not.toBe(cifrar("igual"));
  });

  it("detecta si alguien alteró el dato en la base", () => {
    const guardado = cifrar("secreto");
    expect(() => descifrar(guardado.slice(0, -4) + "AAAA")).toThrow();
  });

  it("rechaza un formato que no es el suyo", () => {
    expect(() => descifrar("basura")).toThrow();
  });

  it("aguanta acentos y emoji", () => {
    const raro = "contraseña ñÁÉ 🏠";
    expect(descifrar(cifrar(raro))).toBe(raro);
  });

  it("no cifra una cadena vacía", () => {
    expect(() => cifrar("")).toThrow();
  });
});

describe("subllave — separación por propósito", () => {
  it("cada propósito da una llave distinta", () => {
    // Si fueran iguales, rotar la llave de sesiones dejaría ilegibles las
    // contraseñas de Infonavit.
    expect(subllave("cifrado").equals(subllave("sesion"))).toBe(false);
  });

  it("el mismo propósito da siempre la misma llave", () => {
    expect(subllave("cifrado").equals(subllave("cifrado"))).toBe(true);
  });

  it("truena si falta la llave en el entorno", () => {
    const antes = process.env.APPBRICK_LLAVE_CIFRADO;
    delete process.env.APPBRICK_LLAVE_CIFRADO;
    expect(() => subllave("cifrado")).toThrow(/APPBRICK_LLAVE_CIFRADO/);
    process.env.APPBRICK_LLAVE_CIFRADO = antes;
  });

  it("rechaza una llave demasiado corta", () => {
    const antes = process.env.APPBRICK_LLAVE_CIFRADO;
    process.env.APPBRICK_LLAVE_CIFRADO = "corta";
    expect(() => subllave("cifrado")).toThrow(/corta/i);
    process.env.APPBRICK_LLAVE_CIFRADO = antes;
  });
});

describe("tokens de invitación", () => {
  it("son largos e impredecibles", () => {
    expect(generarToken().length).toBeGreaterThanOrEqual(40);
  });

  it("nunca se repiten", () => {
    const muchos = new Set(Array.from({ length: 500 }, () => generarToken()));
    expect(muchos.size).toBe(500);
  });

  it("solo llevan caracteres válidos para una URL", () => {
    expect(generarToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("la comparación reconoce iguales y distintos", () => {
    const t = generarToken();
    expect(tokensIguales(t, t)).toBe(true);
    expect(tokensIguales(t, generarToken())).toBe(false);
    expect(tokensIguales(t, t.slice(0, -1))).toBe(false);
  });
});

describe("hashArchivo", () => {
  it("el mismo contenido da el mismo hash", () => {
    const a = Buffer.from("documento");
    expect(hashArchivo(a)).toBe(hashArchivo(Buffer.from("documento")));
  });

  it("contenidos distintos dan hashes distintos", () => {
    expect(hashArchivo(Buffer.from("a"))).not.toBe(hashArchivo(Buffer.from("b")));
  });
});

describe("contraseñas de usuario", () => {
  it("la contraseña correcta pasa", async () => {
    const hash = await hashearPassword("miContraseña123");
    expect(await verificarPassword("miContraseña123", hash)).toBe(true);
  });

  it("una contraseña incorrecta no pasa", async () => {
    const hash = await hashearPassword("miContraseña123");
    expect(await verificarPassword("otraCosa", hash)).toBe(false);
  });

  it("el hash guardado no contiene la contraseña", async () => {
    const hash = await hashearPassword("miContraseña123");
    expect(hash).not.toContain("miContraseña123");
  });

  it("dos usuarios con la misma contraseña tienen hashes distintos", async () => {
    // La sal: sin ella, una tabla de hashes conocidos revienta las dos a la vez.
    const a = await hashearPassword("igual");
    const b = await hashearPassword("igual");
    expect(a).not.toBe(b);
  });

  it("un hash con formato corrupto no valida nada", async () => {
    expect(await verificarPassword("lo que sea", "basura")).toBe(false);
    expect(await verificarPassword("lo que sea", "")).toBe(false);
  });
});
