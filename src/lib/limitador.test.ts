import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  puedeIntentar,
  registrarFallo,
  limpiarIntentos,
  reiniciarLimitador,
} from "./limitador";
import { db } from "./db";

// El freno de fuerza bruta protege la cuenta que descifra las contraseñas de
// Infonavit. Si se rompe en silencio, nadie lo nota hasta después.
//
// Corre contra la base real porque ahí vive: así también se prueba que el
// contador sobrevive entre peticiones, que era el motivo de sacarlo de memoria.

const P = "prueba-limitador:";

beforeEach(() => reiniciarLimitador(P));
afterAll(async () => {
  await reiniciarLimitador(P);
  await db.$disconnect();
});

describe("limitador de intentos", () => {
  it("deja pasar cuando no hay historial", async () => {
    expect((await puedeIntentar(`${P}nuevo`)).permitido).toBe(true);
  });

  it("aguanta cuatro fallos y bloquea al quinto", async () => {
    const clave = `${P}admin`;
    for (let i = 0; i < 4; i++) {
      await registrarFallo(clave);
      expect((await puedeIntentar(clave)).permitido).toBe(true);
    }
    await registrarFallo(clave);

    const v = await puedeIntentar(clave);
    expect(v.permitido).toBe(false);
    if (!v.permitido) expect(v.segundosRestantes).toBeGreaterThan(0);
  });

  it("consultar entre intentos NO borra la cuenta", async () => {
    // Regresión del bug real: cada consulta reseteaba los intentos.
    const clave = `${P}regresion`;
    for (let i = 0; i < 5; i++) {
      await registrarFallo(clave);
      await puedeIntentar(clave);
      await puedeIntentar(clave);
    }
    expect((await puedeIntentar(clave)).permitido).toBe(false);
  });

  it("un ingreso correcto borra el historial", async () => {
    const clave = `${P}admin`;
    for (let i = 0; i < 5; i++) await registrarFallo(clave);
    expect((await puedeIntentar(clave)).permitido).toBe(false);

    await limpiarIntentos(clave);
    expect((await puedeIntentar(clave)).permitido).toBe(true);
  });

  it("bloquear a uno no bloquea a los demás", async () => {
    for (let i = 0; i < 5; i++) await registrarFallo(`${P}victima`);
    expect((await puedeIntentar(`${P}victima`)).permitido).toBe(false);
    expect((await puedeIntentar(`${P}otro`)).permitido).toBe(true);
  });

  it("informa cuánto falta para poder reintentar", async () => {
    const clave = `${P}espera`;
    for (let i = 0; i < 5; i++) await registrarFallo(clave, { minutosBloqueo: 15 });

    const v = await puedeIntentar(clave);
    expect(v.permitido).toBe(false);
    if (!v.permitido) {
      expect(v.segundosRestantes).toBeGreaterThan(14 * 60);
      expect(v.segundosRestantes).toBeLessThanOrEqual(15 * 60);
    }
  });

  it("el bloqueo se levanta al vencer y la cuenta vuelve a cero", async () => {
    const clave = `${P}vencido`;
    for (let i = 0; i < 5; i++) await registrarFallo(clave, { minutosBloqueo: -1 });
    expect((await puedeIntentar(clave)).permitido).toBe(true);

    // Tras levantarse, un solo fallo no debe volver a bloquear.
    await registrarFallo(clave);
    expect((await puedeIntentar(clave)).permitido).toBe(true);
  });

  it("respeta un máximo distinto", async () => {
    const clave = `${P}max2`;
    await registrarFallo(clave, { maximo: 2 });
    expect((await puedeIntentar(clave)).permitido).toBe(true);
    await registrarFallo(clave, { maximo: 2 });
    expect((await puedeIntentar(clave)).permitido).toBe(false);
  });

  it("aguanta fallos simultáneos sin perder la cuenta", async () => {
    // Cinco intentos al mismo tiempo, como haría un script de ataque.
    const clave = `${P}simultaneo`;
    await Promise.all(Array.from({ length: 5 }, () => registrarFallo(clave)));
    expect((await puedeIntentar(clave)).permitido).toBe(false);
  });
});
