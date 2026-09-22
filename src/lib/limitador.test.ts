import { describe, it, expect, beforeEach } from "vitest";
import {
  puedeIntentar,
  registrarFallo,
  limpiarIntentos,
  reiniciarLimitador,
} from "./limitador";

// El freno de fuerza bruta protege la cuenta que descifra las contraseñas de
// Infonavit. Si se rompe en silencio, nadie lo nota hasta después.

beforeEach(() => reiniciarLimitador());

describe("limitador de intentos", () => {
  it("deja pasar cuando no hay historial", () => {
    expect(puedeIntentar("nuevo@x.com").permitido).toBe(true);
  });

  it("aguanta cuatro fallos y bloquea al quinto", () => {
    const correo = "admin@x.com";
    for (let i = 0; i < 4; i++) {
      registrarFallo(correo);
      expect(puedeIntentar(correo).permitido).toBe(true);
    }
    registrarFallo(correo);

    const v = puedeIntentar(correo);
    expect(v.permitido).toBe(false);
    if (!v.permitido) expect(v.segundosRestantes).toBeGreaterThan(0);
  });

  it("un ingreso correcto borra el historial", () => {
    const correo = "admin@x.com";
    for (let i = 0; i < 5; i++) registrarFallo(correo);
    expect(puedeIntentar(correo).permitido).toBe(false);

    limpiarIntentos(correo);
    expect(puedeIntentar(correo).permitido).toBe(true);
  });

  it("bloquear a uno no bloquea a los demás", () => {
    for (let i = 0; i < 5; i++) registrarFallo("victima@x.com");
    expect(puedeIntentar("victima@x.com").permitido).toBe(false);
    expect(puedeIntentar("otro@x.com").permitido).toBe(true);
  });

  it("solo consultar no gasta intentos", () => {
    const correo = "admin@x.com";
    for (let i = 0; i < 20; i++) puedeIntentar(correo);
    expect(puedeIntentar(correo).permitido).toBe(true);
  });

  it("informa cuánto falta para poder reintentar", () => {
    const correo = "admin@x.com";
    for (let i = 0; i < 5; i++) registrarFallo(correo, { minutosBloqueo: 15 });

    const v = puedeIntentar(correo);
    expect(v.permitido).toBe(false);
    if (!v.permitido) {
      expect(v.segundosRestantes).toBeGreaterThan(14 * 60);
      expect(v.segundosRestantes).toBeLessThanOrEqual(15 * 60);
    }
  });

  it("el bloqueo se levanta al vencer", () => {
    const correo = "admin@x.com";
    // Bloqueo negativo = ya vencido, sin tener que esperar en la prueba.
    for (let i = 0; i < 5; i++) registrarFallo(correo, { minutosBloqueo: -1 });
    expect(puedeIntentar(correo).permitido).toBe(true);
  });

  it("respeta un máximo distinto", () => {
    const correo = "admin@x.com";
    registrarFallo(correo, { maximo: 2 });
    expect(puedeIntentar(correo).permitido).toBe(true);
    registrarFallo(correo, { maximo: 2 });
    expect(puedeIntentar(correo).permitido).toBe(false);
  });
});
