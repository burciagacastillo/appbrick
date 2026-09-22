import { describe, it, expect } from "vitest";
import { aFichaPublica, aFichasPublicas, fichaParaBot, linkWhatsApp } from "./publico";
import type { Propiedad, Foto } from "@prisma/client";

// La lista blanca que separa lo público de lo confidencial.
//
// La prueba central de este archivo convierte una fuga real —el nombre del
// vendedor saliendo en el texto alternativo de las fotos— en algo que ya no
// puede volver sin que las pruebas truenen.

function propiedadDePrueba(
  over: Partial<Propiedad & { fotos: Foto[] }> = {}
): Propiedad & { fotos: Foto[] } {
  return {
    id: "nueva-fe-jona",
    // El nombre interno trae el nombre del vendedor. Es lo normal en la app.
    nombre: "Nueva Fe (Jonathan)",
    direccion: "Calle Nueva Fe 9310",
    colonia: "Campo Bello",
    ciudad: "Chihuahua",
    etapa: "en_venta",
    tipo: "casa",
    carpetaLocal: "C:/privado/nueva fe",
    carpetaDrive: null,

    // --- Todo esto es confidencial y NO puede salir ---
    valorCompra: 620_000,
    valorVentaEstimado: 980_000,
    valorVentaReal: null,
    presupuestoObra: 150_000,
    saldoCreditoVendedor: 381_000,
    montoCreditoComprador: 850_000,
    enganche: 50_000,
    notaria: "Notaría 29",
    fechaFirmaProgramada: null,
    fechaCompra: null,
    fechaVenta: null,
    fechaCierreObjetivo: null,
    notas: "Jonathan quiere cerrar antes de diciembre. Margen apretado.",

    // --- Esto sí es público ---
    publicada: true,
    destacada: false,
    slugPublico: "casa-en-campo-bello",
    tituloPublico: "Casa en Campo Bello",
    descripcionPublica: "Casa de 2 recámaras, lista para entrar a vivir.",
    precioPublico: 980_000,
    mostrarPrecio: true,
    recamaras: 2,
    banos: 1,
    m2Terreno: 120,
    m2Construccion: 78,
    cochera: 1,
    aceptaInfonavit: true,
    aceptaBancario: true,

    creadoEn: new Date(),
    actualizadoEn: new Date(),
    fotos: [],
    ...over,
  } as Propiedad & { fotos: Foto[] };
}

function foto(over: Partial<Foto> = {}): Foto {
  return {
    id: "foto1",
    propiedadId: "nueva-fe-jona",
    archivo: "propiedades/nueva-fe-jona/fotos/1.jpg",
    alt: null,
    hash: null,
    orden: 0,
    esPortada: true,
    creadoEn: new Date(),
    ...over,
  } as Foto;
}

describe("aFichaPublica — lista blanca", () => {
  it("no deja salir NINGÚN dato confidencial", () => {
    const f = aFichaPublica(propiedadDePrueba());
    const serializada = JSON.stringify(f);

    // Nombres de personas
    expect(serializada).not.toContain("Jonathan");
    // Dinero interno
    expect(serializada).not.toContain("620000");
    expect(serializada).not.toContain("381000");
    expect(serializada).not.toContain("150000");
    // Notas internas y rutas del disco
    expect(serializada).not.toContain("Margen apretado");
    expect(serializada).not.toContain("C:/privado");
    expect(serializada).not.toContain("Notaría 29");
  });

  it("el texto alternativo de la foto nunca usa el nombre interno", () => {
    // Fuga real: la foto tenía guardado "Nueva Fe (Jonathan)" como alt y se
    // publicaba tal cual, exponiendo al vendedor en el HTML.
    const p = propiedadDePrueba({
      fotos: [foto({ alt: "Nueva Fe (Jonathan)" })],
    });
    const f = aFichaPublica(p)!;
    expect(f.fotos[0].alt).toBe("Casa en Campo Bello");
    expect(JSON.stringify(f)).not.toContain("Jonathan");
  });

  it("sin título público tampoco cae al nombre interno en el alt", () => {
    const p = propiedadDePrueba({
      tituloPublico: null,
      fotos: [foto({ alt: null })],
    });
    const f = aFichaPublica(p)!;
    expect(f.fotos[0].alt).not.toContain("Jonathan");
  });

  it("devuelve null si no está publicada", () => {
    expect(aFichaPublica(propiedadDePrueba({ publicada: false }))).toBeNull();
  });

  it("devuelve null si no tiene dirección pública", () => {
    expect(aFichaPublica(propiedadDePrueba({ slugPublico: null }))).toBeNull();
  });

  it("calla el precio cuando se pidió ocultarlo", () => {
    const f = aFichaPublica(propiedadDePrueba({ mostrarPrecio: false }))!;
    expect(f.precio).toBeNull();
  });

  it("marca como vendida la propiedad concluida", () => {
    const f = aFichaPublica(propiedadDePrueba({ etapa: "concluida" }))!;
    expect(f.vendida).toBe(true);
  });

  it("pone la portada primero", () => {
    const p = propiedadDePrueba({
      fotos: [
        foto({ id: "b", esPortada: false, orden: 1 }),
        foto({ id: "a", esPortada: true, orden: 5 }),
      ],
    });
    const f = aFichaPublica(p)!;
    expect(f.fotos[0].url).toContain("/a");
  });
});

describe("aFichasPublicas", () => {
  it("filtra las no publicadas y pone primero las destacadas", () => {
    const lista = aFichasPublicas([
      propiedadDePrueba({ id: "1", slugPublico: "uno", destacada: false }),
      propiedadDePrueba({ id: "2", slugPublico: "dos", destacada: true }),
      propiedadDePrueba({ id: "3", slugPublico: "tres", publicada: false }),
    ]);
    expect(lista).toHaveLength(2);
    expect(lista[0].slug).toBe("dos");
  });

  it("manda las vendidas al final", () => {
    const lista = aFichasPublicas([
      propiedadDePrueba({ id: "1", slugPublico: "vendida", etapa: "concluida" }),
      propiedadDePrueba({ id: "2", slugPublico: "disponible" }),
    ]);
    expect(lista[0].slug).toBe("disponible");
  });
});

describe("fichaParaBot", () => {
  it("el contexto del chatbot tampoco lleva datos confidenciales", () => {
    // El bot solo puede contestar con lo que le damos: si aquí no hay
    // márgenes, el bot no puede filtrarlos aunque le insistan.
    const f = aFichaPublica(propiedadDePrueba())!;
    const texto = fichaParaBot(f);
    expect(texto).not.toContain("Jonathan");
    expect(texto).not.toContain("620");
    expect(texto).toContain("Casa en Campo Bello");
  });

  it("dice claramente cuando ya se vendió", () => {
    const f = aFichaPublica(propiedadDePrueba({ etapa: "concluida" }))!;
    expect(fichaParaBot(f)).toContain("VENDIDA");
  });
});

describe("linkWhatsApp", () => {
  it("mete el nombre de la casa en el mensaje", () => {
    const link = linkWhatsApp({ titulo: "Casa en Campo Bello" });
    expect(decodeURIComponent(link)).toContain("Casa en Campo Bello");
    expect(link).toMatch(/^https:\/\/wa\.me\/\d+/);
  });
});
