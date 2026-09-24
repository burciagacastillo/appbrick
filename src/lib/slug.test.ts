import { describe, it, expect } from "vitest";
import { aSlug, idUnico } from "./slug";

// El id de una propiedad es la liga de todas sus páginas: si dos chocan, una
// tapa a la otra; si se llama igual que una ruta fija, queda inalcanzable.

describe("aSlug", () => {
  it("quita acentos, mayúsculas y signos", () => {
    expect(aSlug("Sierra la Escondida")).toBe("sierra-la-escondida");
    expect(aSlug("Praderas del Sur #12")).toBe("praderas-del-sur-12");
    expect(aSlug("  Ñandú   Álamos ")).toBe("nandu-alamos");
  });

  it("un nombre sin letras ni números queda vacío", () => {
    expect(aSlug("¡¿?!")).toBe("");
  });
});

describe("idUnico", () => {
  const nadieOcupa = async () => false;

  it("usa el nombre tal cual si está libre", async () => {
    expect(await idUnico("Casa de Aldama", nadieOcupa)).toBe("casa-de-aldama");
  });

  it("si ya existe, le agrega un número en vez de pisarla", async () => {
    const ocupados = new Set(["turmalina", "turmalina-2"]);
    expect(await idUnico("Turmalina", async (id) => ocupados.has(id))).toBe("turmalina-3");
  });

  it("nunca usa 'nueva': taparía la página de alta", async () => {
    expect(await idUnico("Nueva", nadieOcupa)).toBe("nueva-2");
  });

  it("un nombre sin letras recibe un id genérico", async () => {
    expect(await idUnico("¡¿?!", nadieOcupa)).toBe("propiedad");
  });
});
