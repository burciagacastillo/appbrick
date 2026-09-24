import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { DOCS_CONYUGE, nuevoEstadoConyuge, sincronizarConyuge } from "./conyuge";
import { tramitesDelInvitado } from "./invitaciones";

// Documentos del cónyuge: se abren si el vendedor o el comprador es casado y
// se cierran si no. Regla de Erick del 24/09/2026.

describe("nuevoEstadoConyuge — la regla", () => {
  it("casado: lo cerrado se abre", () => {
    expect(nuevoEstadoConyuge({ casado: true, estado: "no_aplica", tieneDocumentos: false })).toBe("falta");
  });

  it("no casado: lo abierto sin nada se cierra", () => {
    expect(nuevoEstadoConyuge({ casado: false, estado: "falta", tieneDocumentos: false })).toBe("no_aplica");
  });

  it("no casado pero con archivo subido: NO se toca (no se pierde trabajo)", () => {
    expect(nuevoEstadoConyuge({ casado: false, estado: "falta", tieneDocumentos: true })).toBeNull();
    expect(nuevoEstadoConyuge({ casado: false, estado: "revisar", tieneDocumentos: false })).toBeNull();
    expect(nuevoEstadoConyuge({ casado: false, estado: "completo", tieneDocumentos: false })).toBeNull();
  });

  it("casado y ya abierto o avanzado: se queda como está", () => {
    expect(nuevoEstadoConyuge({ casado: true, estado: "falta", tieneDocumentos: false })).toBeNull();
    expect(nuevoEstadoConyuge({ casado: true, estado: "completo", tieneDocumentos: true })).toBeNull();
  });
});

describe("tramitesDelInvitado — el link no pide lo que no aplica", () => {
  const t = (bloque: string, estado: string, loSubeInvitado = true) => ({
    estado,
    catalogo: { bloque, loSubeInvitado },
  });

  it("deja fuera lo que está en 'no aplica'", () => {
    const lista = [t("A", "falta"), t("A", "no_aplica"), t("A", "completo")];
    expect(tramitesDelInvitado(lista, "A")).toHaveLength(2);
  });

  it("solo su bloque y solo lo que sube el invitado", () => {
    const lista = [t("A", "falta"), t("B", "falta"), t("A", "falta", false)];
    expect(tramitesDelInvitado(lista, "A")).toHaveLength(1);
  });
});

describe("sincronizarConyuge — contra la base", () => {
  const PROPIEDAD = "propiedad-prueba-conyuge";
  let vendedorId = "";

  async function estado(numero: number) {
    const tr = await db.tramite.findFirst({
      where: { propiedadId: PROPIEDAD, catalogo: { numero } },
    });
    return tr?.estado;
  }

  beforeAll(async () => {
    const catalogo = await db.tramiteCatalogo.findMany({ select: { id: true, numero: true } });
    await db.propiedad.delete({ where: { id: PROPIEDAD } }).catch(() => {});
    await db.propiedad.create({
      data: {
        id: PROPIEDAD,
        nombre: "Casa de prueba (cónyuge)",
        etapa: "en_tramite",
        tramites: {
          create: catalogo.map((c) => ({
            catalogoId: c.id,
            estado: c.numero === 6 || c.numero >= 34 ? "no_aplica" : "falta",
          })),
        },
      },
    });
    const vendedor = await db.persona.create({ data: { nombre: "Vendedor de prueba (cónyuge)" } });
    vendedorId = vendedor.id;
    await db.propiedadPersona.create({
      data: { propiedadId: PROPIEDAD, personaId: vendedorId, rol: "vendedor" },
    });
  });

  afterAll(async () => {
    await db.propiedad.delete({ where: { id: PROPIEDAD } }).catch(() => {});
    await db.persona.delete({ where: { id: vendedorId } }).catch(() => {});
    await db.$disconnect();
  });

  it("vendedor casado: se abren el acta (6) y lo de su cónyuge (34-37), no lo del comprador", async () => {
    await db.persona.update({ where: { id: vendedorId }, data: { estadoCivil: "casado" } });
    await sincronizarConyuge(PROPIEDAD);

    for (const numero of DOCS_CONYUGE.vendedor) expect(await estado(numero)).toBe("falta");
    for (const numero of DOCS_CONYUGE.comprador) expect(await estado(numero)).toBe("no_aplica");
  });

  it("si resulta soltero, se vuelven a cerrar", async () => {
    await db.persona.update({ where: { id: vendedorId }, data: { estadoCivil: "soltero" } });
    await sincronizarConyuge(PROPIEDAD);

    for (const numero of DOCS_CONYUGE.vendedor) expect(await estado(numero)).toBe("no_aplica");
  });

  it("lo que ya avanzó no se cierra aunque cambie a soltero", async () => {
    await db.persona.update({ where: { id: vendedorId }, data: { estadoCivil: "casado" } });
    await sincronizarConyuge(PROPIEDAD);
    const t34 = await db.tramite.findFirstOrThrow({
      where: { propiedadId: PROPIEDAD, catalogo: { numero: 34 } },
    });
    await db.tramite.update({ where: { id: t34.id }, data: { estado: "completo" } });

    await db.persona.update({ where: { id: vendedorId }, data: { estadoCivil: "soltero" } });
    await sincronizarConyuge(PROPIEDAD);

    expect(await estado(34)).toBe("completo");
    expect(await estado(35)).toBe("no_aplica");
  });
});
