import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { claveDia, instanteDelDia, sumarDias, hoy } from "@/lib/agenda";

// Pasos y agenda contra la base de verdad. Fuera de Next no hay sesión ni
// caché: se sustituyen el permiso y la caché (no es lo que se prueba aquí).

vi.mock("@/lib/permisos", () => ({
  exigirAdmin: async () => ({ id: "admin-prueba", nombre: "Prueba", rol: "admin" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { guardarPaso, alternarPaso, guardarFechasClave } = await import("./pasos");
const { eventosAgenda } = await import("@/lib/queries");

function forma(datos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(datos)) f.set(k, v);
  return f;
}

const sello = Date.now();
const AQUI = `prueba-pasos-${sello}`;
const OTRA = `prueba-pasos-otra-${sello}`;
const CERRADA = `prueba-pasos-concluida-${sello}`;
const HOY = hoy();
let tramiteLuz = "";
let tramiteAgua = "";
let tramiteAjeno = "";

beforeAll(async () => {
  const [luz, agua] = await Promise.all([
    db.tramiteCatalogo.findUniqueOrThrow({ where: { numero: 26 } }),
    db.tramiteCatalogo.findUniqueOrThrow({ where: { numero: 25 } }),
  ]);
  await db.propiedad.create({ data: { id: AQUI, nombre: "Casa de pasos", etapa: "en_tramite" } });
  await db.propiedad.create({ data: { id: OTRA, nombre: "Otra casa", etapa: "en_tramite" } });
  await db.propiedad.create({ data: { id: CERRADA, nombre: "Casa concluida", etapa: "concluida" } });
  tramiteLuz = (await db.tramite.create({ data: { propiedadId: AQUI, catalogoId: luz.id } })).id;
  tramiteAgua = (await db.tramite.create({ data: { propiedadId: AQUI, catalogoId: agua.id, estado: "no_aplica" } })).id;
  tramiteAjeno = (await db.tramite.create({ data: { propiedadId: OTRA, catalogoId: luz.id } })).id;
});

afterAll(async () => {
  await db.propiedad.deleteMany({ where: { id: { in: [AQUI, OTRA, CERRADA] } } });
});

describe("guardarPaso", () => {
  it("guarda el día elegido (en Chihuahua) y su hora", async () => {
    const dia = sumarDias(HOY, 2);
    const r = await guardarPaso(null, forma({ propiedadId: AQUI, titulo: "Cita en notaría", fecha: dia, hora: "10:30" }));
    expect(r).toEqual({ ok: true });
    const paso = await db.paso.findFirstOrThrow({ where: { propiedadId: AQUI, titulo: "Cita en notaría" } });
    expect(claveDia(paso.fecha!)).toBe(dia);
    expect(paso.hora).toBe("10:30");
  });

  it("una hora sin día se descarta", async () => {
    await guardarPaso(null, forma({ propiedadId: AQUI, titulo: "Pedir avalúo", hora: "09:00" }));
    const paso = await db.paso.findFirstOrThrow({ where: { propiedadId: AQUI, titulo: "Pedir avalúo" } });
    expect(paso.fecha).toBeNull();
    expect(paso.hora).toBeNull();
  });

  it("solo se liga a un trámite de la MISMA propiedad", async () => {
    const ajeno = await guardarPaso(null, forma({ propiedadId: AQUI, titulo: "Truco", tramiteId: tramiteAjeno }));
    expect(ajeno).toEqual({ ok: false, error: "Ese trámite no es de esta propiedad." });

    const propio = await guardarPaso(null, forma({ propiedadId: AQUI, titulo: "Recibo de luz nuevo", tramiteId: tramiteLuz }));
    expect(propio).toEqual({ ok: true });
  });

  it("no edita un paso de otra propiedad", async () => {
    const ajeno = await db.paso.create({ data: { propiedadId: OTRA, titulo: "De la otra" } });
    const r = await guardarPaso(null, forma({ propiedadId: AQUI, pasoId: ajeno.id, titulo: "Cambiado" }));
    expect(r).toEqual({ ok: false, error: "Ese paso ya no existe." });
    expect((await db.paso.findUniqueOrThrow({ where: { id: ajeno.id } })).titulo).toBe("De la otra");
  });

  it("rechaza una fecha imposible", async () => {
    const r = await guardarPaso(null, forma({ propiedadId: AQUI, titulo: "X", fecha: "2026-02-31" }));
    expect(r.ok).toBe(false);
  });
});

describe("alternarPaso", () => {
  it("lo marca hecho con su fecha, y lo regresa a pendiente", async () => {
    const paso = await db.paso.create({ data: { propiedadId: AQUI, titulo: "Ir a catastro" } });
    await alternarPaso(forma({ pasoId: paso.id }));
    const hecho = await db.paso.findUniqueOrThrow({ where: { id: paso.id } });
    expect(hecho.hecho).toBe(true);
    expect(hecho.hechoEn).not.toBeNull();

    await alternarPaso(forma({ pasoId: paso.id }));
    const deNuevo = await db.paso.findUniqueOrThrow({ where: { id: paso.id } });
    expect(deNuevo.hecho).toBe(false);
    expect(deNuevo.hechoEn).toBeNull();
  });
});

describe("eventosAgenda — lo que sale en la agenda", () => {
  it("firma, cierre, pasos y solo el documento vigente de cada trámite", async () => {
    const enDos = sumarDias(HOY, 2);
    await guardarFechasClave(
      forma({ propiedadId: AQUI, fechaFirmaProgramada: enDos, fechaCierreObjetivo: sumarDias(HOY, 40) })
    );

    // Recibo de luz viejo (vence pronto) y uno nuevo que lo reemplaza (vence en 3 días).
    const base = { propiedadId: AQUI, nombreOriginal: "luz.pdf", ruta: "x", mimeType: "application/pdf", tamanoBytes: 1, subidoPorTipo: "admin" };
    await db.documento.create({
      data: { ...base, tramiteId: tramiteLuz, nombreArchivo: "26 - viejo.pdf", estado: "aprobado", vigenciaHasta: instanteDelDia(sumarDias(HOY, -5)), creadoEn: new Date(Date.now() - 86_400_000) },
    });
    await db.documento.create({
      data: { ...base, tramiteId: tramiteLuz, nombreArchivo: "26 - nuevo.pdf", estado: "aprobado", vigenciaHasta: instanteDelDia(sumarDias(HOY, 3)) },
    });
    // Un trámite marcado "no aplica" no avisa nada.
    await db.documento.create({
      data: { ...base, tramiteId: tramiteAgua, nombreArchivo: "25 - agua.pdf", estado: "aprobado", vigenciaHasta: instanteDelDia(HOY) },
    });
    // Un paso hecho hace mucho no sale; la propiedad concluida tampoco.
    await db.paso.create({ data: { propiedadId: AQUI, titulo: "Hecho hace mucho", hecho: true, fecha: instanteDelDia(sumarDias(HOY, -60)) } });
    await db.paso.create({ data: { propiedadId: CERRADA, titulo: "De una concluida", fecha: instanteDelDia(HOY) } });

    const eventos = (await eventosAgenda({ desde: HOY, hasta: sumarDias(HOY, 6) })).filter(
      (e) => e.propiedadId === AQUI || e.propiedadId === CERRADA
    );

    expect(eventos.find((e) => e.tipo === "firma")?.dia).toBe(enDos);
    expect(eventos.some((e) => e.tipo === "cierre")).toBe(false); // fuera del rango

    const vencen = eventos.filter((e) => e.tipo === "vence");
    expect(vencen).toHaveLength(1);
    expect(vencen[0]).toMatchObject({ dia: sumarDias(HOY, 3), titulo: "Vence: Recibo de luz" });

    const titulos = eventos.filter((e) => e.tipo === "paso").map((e) => e.titulo);
    expect(titulos).toContain("Pedir avalúo"); // sin fecha: también sale (va a "sin fecha")
    expect(titulos).not.toContain("Hecho hace mucho");
    expect(titulos).not.toContain("De una concluida");
  });
});
