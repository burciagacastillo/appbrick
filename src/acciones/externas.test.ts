import { describe, it, expect, vi, afterAll } from "vitest";
import { db } from "@/lib/db";
import { NUMEROS_AVALUO } from "@/lib/modalidad";

// Las acciones de verdad contra la base: propiedad externa de "solo avalúo",
// el contacto (la licenciada de la notaría) y las notas de la persona, que
// hasta el 01/10/2026 la ficha mandaba y no se guardaban.
//
// Fuera de Next no hay sesión ni caché: se sustituyen el permiso, la caché,
// la redirección y la bitácora (que no es lo que se prueba aquí).

vi.mock("@/lib/permisos", () => ({
  exigirAdmin: async () => ({ id: "admin-prueba", nombre: "Prueba", rol: "admin" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/bitacora", () => ({ registrar: async () => {} }));

const { crearPropiedad } = await import("./propiedades");
const { vincularPersona, guardarPersona } = await import("./personas");

function forma(datos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(datos)) f.set(k, v);
  return f;
}

const creadas: string[] = [];
const personas: string[] = [];

afterAll(async () => {
  await db.propiedad.deleteMany({ where: { id: { in: creadas } } });
  await db.persona.deleteMany({ where: { id: { in: personas } } });
});

async function crear(datos: Record<string, string>) {
  // crearPropiedad termina redirigiendo a la ficha: esa es la señal de éxito.
  const error = await crearPropiedad(null, forma(datos)).then(
    (r) => r,
    (e: Error) => e
  );
  const id = error instanceof Error ? error.message.match(/^REDIRECT \/propiedades\/(.+)$/)?.[1] : undefined;
  if (!id) throw new Error(`No se creó: ${JSON.stringify(error)}`);
  creadas.push(decodeURIComponent(id));
  return decodeURIComponent(id);
}

describe("alta de una propiedad externa", () => {
  it("solo avalúo: abre únicamente lo del valuador, sin valor de compra", async () => {
    const id = await crear({
      nombre: `Prueba externa avaluo ${Date.now()}`,
      tipo: "casa",
      etapa: "en_tramite",
      modalidad: "externa",
      expediente: "avaluo",
      cobroCliente: "45000",
      // Si se colara (p. ej. campo viejo en el formulario), no debe guardarse.
      valorCompra: "900000",
    });

    const p = await db.propiedad.findUniqueOrThrow({
      where: { id },
      include: { tramites: { include: { catalogo: true } } },
    });
    expect(p.modalidad).toBe("externa");
    expect(p.cobroCliente).toBe(45_000);
    expect(p.valorCompra).toBeNull();

    const abiertos = p.tramites.filter((t) => t.estado === "falta").map((t) => t.catalogo.numero);
    expect(abiertos.sort((a, b) => a - b)).toEqual([...NUMEROS_AVALUO].sort((a, b) => a - b));
    expect(p.tramites).toHaveLength(await db.tramiteCatalogo.count());
  });

  it("propia: como siempre, con su valor de compra y sin cobro", async () => {
    const id = await crear({
      nombre: `Prueba propia ${Date.now()}`,
      tipo: "casa",
      etapa: "adquisicion",
      valorCompra: "620000",
      cobroCliente: "1000",
    });
    const p = await db.propiedad.findUniqueOrThrow({ where: { id } });
    expect(p.modalidad).toBe("propia");
    expect(p.valorCompra).toBe(620_000);
    expect(p.cobroCliente).toBeNull();
  });
});

describe("el contacto y las notas de la persona", () => {
  it("el contacto se agrega con quién es, y se corrige desde su ficha", async () => {
    const [aqui, otra] = await Promise.all([
      crear({ nombre: `Prueba contacto ${Date.now()}`, tipo: "casa", etapa: "en_tramite", modalidad: "externa" }),
      crear({ nombre: `Prueba contacto otra ${Date.now()}`, tipo: "casa", etapa: "en_tramite" }),
    ]);

    const nombre = `Lic. Prueba ${Date.now()}`;
    const r = await vincularPersona(
      null,
      forma({ propiedadId: aqui, nombre, telefono: "614 555 0101", rol: "contacto", quienEs: "Licenciada de la notaría 5" })
    );
    expect(r).toEqual({ ok: true });

    const vinculo = await db.propiedadPersona.findFirstOrThrow({
      where: { propiedadId: aqui, rol: "contacto" },
      include: { persona: true },
    });
    personas.push(vinculo.personaId);
    expect(vinculo.notas).toBe("Licenciada de la notaría 5");

    // La misma persona en otra operación: su "quién es" de allá no se toca.
    const deAlla = await db.propiedadPersona.create({
      data: { propiedadId: otra, personaId: vinculo.personaId, rol: "contacto", notas: "Asesora del vendedor" },
    });

    const g = await guardarPersona(
      null,
      forma({
        personaId: vinculo.personaId,
        propiedadId: aqui,
        nombre,
        telefono: "614 555 0101",
        vinculoId: vinculo.id,
        quienEs: "Licenciada de la notaría 12",
        notas: "Contesta en la tarde",
      })
    );
    expect(g).toEqual({ ok: true });

    expect((await db.propiedadPersona.findUniqueOrThrow({ where: { id: vinculo.id } })).notas).toBe(
      "Licenciada de la notaría 12"
    );
    expect((await db.propiedadPersona.findUniqueOrThrow({ where: { id: deAlla.id } })).notas).toBe(
      "Asesora del vendedor"
    );

    // Regresión: las notas de la ficha se mandaban y no se guardaban.
    expect((await db.persona.findUniqueOrThrow({ where: { id: vinculo.personaId } })).notas).toBe(
      "Contesta en la tarde"
    );
  });

  it("un vinculoId de otra propiedad no se puede reescribir desde esta", async () => {
    const [aqui, otra] = await Promise.all([
      crear({ nombre: `Prueba ajena ${Date.now()}`, tipo: "casa", etapa: "en_tramite" }),
      crear({ nombre: `Prueba ajena otra ${Date.now()}`, tipo: "casa", etapa: "en_tramite" }),
    ]);
    const persona = await db.persona.create({ data: { nombre: `Prueba ajena ${Date.now()}` } });
    personas.push(persona.id);
    const ajeno = await db.propiedadPersona.create({
      data: { propiedadId: otra, personaId: persona.id, rol: "contacto", notas: "Original" },
    });

    await guardarPersona(
      null,
      forma({ personaId: persona.id, propiedadId: aqui, nombre: persona.nombre, vinculoId: ajeno.id, quienEs: "Cambiado" })
    );
    expect((await db.propiedadPersona.findUniqueOrThrow({ where: { id: ajeno.id } })).notas).toBe("Original");
  });
});
