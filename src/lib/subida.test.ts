import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { esRutaEntrante, eliminar } from "./almacen";
import { recibirArchivo, guardarDocumento } from "./subida";

// La subida de documentos al expediente: la del comprador y la de Erick.
// La sala de espera (_entrantes/) es la puerta nueva por donde un tercero
// podría intentar colarse, así que es lo primero que se prueba.

const PROPIEDAD = "propiedad-prueba-subida";
const PDF = Buffer.from("%PDF-1.4\nprueba de subida\n");
const HTML = Buffer.from("<html><script>alert(1)</script></html>");

describe("sala de espera — solo rutas generadas por la app", () => {
  it("acepta el formato que genera la app", () => {
    expect(esRutaEntrante("_entrantes/0123456789abcdef0123456789abcdef")).toBe(true);
  });

  it("rechaza salirse de la sala de espera", () => {
    expect(esRutaEntrante("_entrantes/../propiedades/x/documentos/8 - INE.pdf")).toBe(false);
    expect(esRutaEntrante("_entrantes/0123456789abcdef0123456789abcdef/../../x")).toBe(false);
  });

  it("rechaza pedir el documento de otra persona por su ruta", () => {
    expect(esRutaEntrante("propiedades/turmalina/documentos/2 - INE.pdf")).toBe(false);
  });

  it("rechaza nombres que no son los aleatorios de la app", () => {
    expect(esRutaEntrante("_entrantes/ine.pdf")).toBe(false);
    expect(esRutaEntrante("_entrantes/0123456789ABCDEF0123456789ABCDEF")).toBe(false);
    expect(esRutaEntrante("_entrantes/")).toBe(false);
  });

  it("recibirArchivo no lee una ruta de fuera de la sala de espera", async () => {
    const datos = new FormData();
    datos.append("rutaEntrante", "propiedades/turmalina/documentos/2 - INE.pdf");
    const r = await recibirArchivo(datos);
    expect(r.ok).toBe(false);
  });
});

describe("recibirArchivo — adjunto en el formulario", () => {
  it("lee el archivo adjunto", async () => {
    const datos = new FormData();
    datos.append("archivo", new File([PDF], "acta.pdf", { type: "application/pdf" }));
    const r = await recibirArchivo(datos);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nombreOriginal).toBe("acta.pdf");
      expect(r.contenido.equals(PDF)).toBe(true);
    }
  });

  it("sin archivo, avisa en vez de tronar", async () => {
    const r = await recibirArchivo(new FormData());
    expect(r.ok).toBe(false);
  });
});

describe("guardarDocumento", () => {
  let tramite: { id: string; catalogo: { numero: number; nombre: string; vigenciaDias: number | null } };
  const rutas: string[] = [];

  beforeAll(async () => {
    await db.propiedad.upsert({
      where: { id: PROPIEDAD },
      update: {},
      create: { id: PROPIEDAD, nombre: "Casa de prueba subida", etapa: "en_tramite" },
    });
    const catalogo = await db.tramiteCatalogo.findFirstOrThrow({ where: { numero: 3 } });
    tramite = await db.tramite.upsert({
      where: { propiedadId_catalogoId: { propiedadId: PROPIEDAD, catalogoId: catalogo.id } },
      update: {},
      create: { propiedadId: PROPIEDAD, catalogoId: catalogo.id, estado: "falta" },
      include: { catalogo: true },
    });
  });

  afterAll(async () => {
    const docs = await db.documento.findMany({ where: { propiedadId: PROPIEDAD } });
    for (const d of docs) rutas.push(d.ruta);
    for (const r of rutas) await eliminar(r).catch(() => {});
    await db.propiedad.delete({ where: { id: PROPIEDAD } }).catch(() => {});
    await db.$disconnect();
  });

  const base = () => ({
    propiedad: { id: PROPIEDAD, nombre: "Casa de prueba subida" },
    tramite,
    subTipo: null,
    nombreOriginal: "acta.pdf",
    estado: "aprobado" as const,
    subidoPor: { tipo: "invitado" as const, invitacionId: "no-existe" },
  });

  it("RECHAZA un HTML aunque venga como documento", async () => {
    const r = await guardarDocumento({ ...base(), contenido: HTML });
    expect(r.ok).toBe(false);
  });

  it("guarda con tu convención, aprobado, y no duplica el mismo archivo", async () => {
    const admin = await db.usuario.findFirst({ where: { rol: "admin" } });
    if (!admin) return; // sin admin en la base local no hay con quién probar
    const opciones = {
      ...base(),
      subidoPor: { tipo: "admin" as const, usuarioId: admin.id },
      contenido: Buffer.concat([PDF, Buffer.from(String(Date.now()))]),
    };

    const primero = await guardarDocumento(opciones);
    expect(primero.ok).toBe(true);
    if (primero.ok && !primero.duplicado) {
      expect(primero.nombreArchivo).toMatch(/^3 - /);
      expect(primero.nombreArchivo).toMatch(/\.pdf$/);
      const doc = await db.documento.findUniqueOrThrow({ where: { id: primero.documentoId } });
      expect(doc.estado).toBe("aprobado");
      expect(doc.revisadoEn).not.toBeNull();
      expect(doc.subidoPorTipo).toBe("admin");
    }

    const segundo = await guardarDocumento(opciones);
    expect(segundo.ok && segundo.duplicado).toBe(true);
  });
});
