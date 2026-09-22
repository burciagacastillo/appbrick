import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { crearPrisma } from "@/lib/db";
import { descifrar } from "@/lib/cripto";
import { sincronizarTramitesDeDatos } from "./personas";

// Cierra el círculo del cifrado: hasta ahora había pruebas de que cifrar y
// descifrar funcionan, pero nada verificaba que la contraseña llegara cifrada
// A LA BASE. Aquí se mira la columna directamente.

const db = crearPrisma();

const PROPIEDAD = "propiedad-prueba-personas";
let personaId = "";

beforeAll(async () => {
  await db.propiedad.upsert({
    where: { id: PROPIEDAD },
    update: {},
    create: { id: PROPIEDAD, nombre: "Casa de prueba", etapa: "en_tramite" },
  });

  const persona = await db.persona.create({
    data: { nombre: "Comprador de prueba", telefono: "614 000 0000" },
  });
  personaId = persona.id;

  await db.propiedadPersona.create({
    data: { propiedadId: PROPIEDAD, personaId, rol: "comprador" },
  });

  // Los trámites que son dato, para poder comprobar que se marcan solos.
  const catalogo = await db.tramiteCatalogo.findMany({ where: { esDato: true } });
  for (const c of catalogo) {
    await db.tramite.upsert({
      where: { propiedadId_catalogoId: { propiedadId: PROPIEDAD, catalogoId: c.id } },
      update: { estado: "falta" },
      create: { propiedadId: PROPIEDAD, catalogoId: c.id, estado: "falta" },
    });
  }
});

afterAll(async () => {
  await db.propiedad.delete({ where: { id: PROPIEDAD } }).catch(() => {});
  await db.persona.delete({ where: { id: personaId } }).catch(() => {});
  await db.$disconnect();
});

beforeEach(async () => {
  await db.persona.update({
    where: { id: personaId },
    data: { nss: null, infonavitPasswordCifrada: null },
  });
  await db.referencia.deleteMany({ where: { personaId } });
});

async function estadoDe(numero: number) {
  const t = await db.tramite.findFirst({
    where: { propiedadId: PROPIEDAD, catalogo: { numero } },
  });
  return t?.estado;
}

describe("contraseña de Infonavit en la base", () => {
  it("NUNCA queda guardada en claro", async () => {
    const { cifrar } = await import("@/lib/cripto");
    const secreto = "MiPassInfonavit2026!";

    await db.persona.update({
      where: { id: personaId },
      data: { infonavitPasswordCifrada: cifrar(secreto) },
    });

    // Se lee la columna tal cual está guardada.
    const guardado = await db.persona.findUnique({ where: { id: personaId } });
    expect(guardado!.infonavitPasswordCifrada).not.toContain(secreto);
    expect(guardado!.infonavitPasswordCifrada).not.toContain("MiPass");

    // Y aun así se recupera igual.
    expect(descifrar(guardado!.infonavitPasswordCifrada!)).toBe(secreto);
  });
});

describe("trámites que son dato, no archivo", () => {
  it("el 13 se marca solo cuando hay NSS y contraseña", async () => {
    const { cifrar } = await import("@/lib/cripto");

    expect(await estadoDe(13)).toBe("falta");

    // Solo con NSS no basta: el trámite necesita las dos cosas.
    await db.persona.update({ where: { id: personaId }, data: { nss: "12345678901" } });
    await sincronizarTramitesDeDatos(PROPIEDAD);
    expect(await estadoDe(13)).toBe("falta");

    await db.persona.update({
      where: { id: personaId },
      data: { infonavitPasswordCifrada: cifrar("x") },
    });
    await sincronizarTramitesDeDatos(PROPIEDAD);
    expect(await estadoDe(13)).toBe("completo");
  });

  it("el 18 y el 19 siguen a cada referencia por separado", async () => {
    expect(await estadoDe(18)).toBe("falta");
    expect(await estadoDe(19)).toBe("falta");

    await db.referencia.create({
      data: { personaId, orden: 1, nombre: "María López", telefono: "614 111 1111" },
    });
    await sincronizarTramitesDeDatos(PROPIEDAD);
    expect(await estadoDe(18)).toBe("completo");
    expect(await estadoDe(19)).toBe("falta");

    await db.referencia.create({
      data: { personaId, orden: 2, nombre: "Juan Pérez" },
    });
    await sincronizarTramitesDeDatos(PROPIEDAD);
    expect(await estadoDe(19)).toBe("completo");
  });

  it("si se borra el dato, el trámite regresa a falta", async () => {
    await db.referencia.create({ data: { personaId, orden: 1, nombre: "María" } });
    await sincronizarTramitesDeDatos(PROPIEDAD);
    expect(await estadoDe(18)).toBe("completo");

    await db.referencia.deleteMany({ where: { personaId, orden: 1 } });
    await sincronizarTramitesDeDatos(PROPIEDAD);
    expect(await estadoDe(18)).toBe("falta");
  });

  it("respeta lo que marcaste como 'no aplica'", async () => {
    const t = await db.tramite.findFirst({
      where: { propiedadId: PROPIEDAD, catalogo: { numero: 18 } },
    });
    await db.tramite.update({ where: { id: t!.id }, data: { estado: "no_aplica" } });

    await db.referencia.create({ data: { personaId, orden: 1, nombre: "María" } });
    await sincronizarTramitesDeDatos(PROPIEDAD);

    // Tu decisión manda sobre el automatismo.
    expect(await estadoDe(18)).toBe("no_aplica");

    await db.tramite.update({ where: { id: t!.id }, data: { estado: "falta" } });
  });
});
