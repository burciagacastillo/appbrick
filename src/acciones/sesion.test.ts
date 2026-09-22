import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { entrar } from "./sesion";
import { crearPrisma } from "@/lib/db";
import { hashearPassword } from "@/lib/sesion";
import { reiniciarLimitador } from "@/lib/limitador";

// Prueba de integración del login contra la base real.
//
// Solo se ejercitan los caminos que FALLAN, que son los que importan aquí:
// el camino exitoso llama a cookies() de Next, que necesita una petición de
// verdad. El freno de fuerza bruta vive justo en los caminos que fallan.

const db = crearPrisma();
const CORREO = "prueba-login@local";

function forma(email: string, password: string) {
  const f = new FormData();
  f.set("email", email);
  f.set("password", password);
  return f;
}

beforeAll(async () => {
  await db.usuario.upsert({
    where: { email: CORREO },
    update: { passwordHash: await hashearPassword("correcta-123"), activo: true },
    create: {
      email: CORREO,
      nombre: "Usuario de prueba",
      rol: "admin",
      passwordHash: await hashearPassword("correcta-123"),
    },
  });
});

afterAll(async () => {
  await db.bitacora.deleteMany({ where: { actor: "Usuario de prueba" } });
  await db.usuario.deleteMany({ where: { email: CORREO } });
  await db.$disconnect();
});

beforeEach(async () => { await reiniciarLimitador("login:"); });

describe("entrar — mensajes", () => {
  it("no revela si el correo existe o no", async () => {
    const inexistente = await entrar(null, forma("noexiste@local", "x"));
    const malaPassword = await entrar(null, forma(CORREO, "incorrecta"));
    // El mismo mensaje en ambos casos: si difirieran, se podría averiguar
    // qué correos están dados de alta probando uno por uno.
    expect(inexistente?.error).toBe(malaPassword?.error);
    expect(malaPassword?.error).toMatch(/incorrectos/i);
  });

  it("pide los datos cuando llegan vacíos", async () => {
    const r = await entrar(null, forma("", ""));
    expect(r?.error).toMatch(/correo|contraseña/i);
  });

  it("acepta correos internos sin dominio público", async () => {
    // "maria@brick.local" es una cuenta válida. Exigir formato público aquí
    // dejaría fuera al equipo sin decir por qué.
    const r = await entrar(null, forma("maria@brick.local", "x"));
    expect(r?.error).toMatch(/incorrectos/i);
  });
});

describe("entrar — freno de fuerza bruta", () => {
  it("bloquea tras cinco intentos fallidos", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await entrar(null, forma(CORREO, `mala-${i}`));
      expect(r?.error).toMatch(/incorrectos/i);
    }

    const sexto = await entrar(null, forma(CORREO, "mala-6"));
    expect(sexto?.error).toMatch(/Demasiados intentos/i);
  });

  it("el bloqueo también detiene a quien SÍ sabe la contraseña", async () => {
    // Si no, un atacante podría seguir probando mientras el bloqueo solo
    // aplicara a contraseñas incorrectas.
    for (let i = 0; i < 5; i++) await entrar(null, forma(CORREO, `mala-${i}`));

    const conLaCorrecta = await entrar(null, forma(CORREO, "correcta-123"));
    expect(conLaCorrecta?.error).toMatch(/Demasiados intentos/i);
  });

  it("bloquear a un correo no afecta a otro", async () => {
    for (let i = 0; i < 6; i++) await entrar(null, forma(CORREO, `mala-${i}`));

    const otro = await entrar(null, forma("otro@local", "x"));
    expect(otro?.error).toMatch(/incorrectos/i);
    expect(otro?.error).not.toMatch(/Demasiados/i);
  });

  it("dice cuántos minutos hay que esperar", async () => {
    for (let i = 0; i < 6; i++) await entrar(null, forma(CORREO, `mala-${i}`));
    const r = await entrar(null, forma(CORREO, "x"));
    expect(r?.error).toMatch(/\d+ minutos?/);
  });
});
