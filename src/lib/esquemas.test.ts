import { describe, it, expect } from "vitest";
import { EsquemaCodigo, EsquemaLogin, EsquemaGasto, validar } from "./esquemas";

// Los esquemas deciden qué entra. Un error aquí no truena: rechaza en
// silencio datos buenos. Así pasó con el código del segundo factor, cuya
// expresión perdió sus diagonales al generarse y exigía "dddddd" en vez de
// seis dígitos: habría dejado al administrador fuera de su propia cuenta.

function forma(datos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(datos)) f.set(k, v);
  return f;
}

describe("EsquemaCodigo — el código del segundo factor", () => {
  it("acepta seis dígitos", () => {
    const r = validar(EsquemaCodigo, forma({ codigo: "772200" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.codigo).toBe("772200");
  });

  it("acepta el código con espacio en medio, como lo muestran las apps", () => {
    const r = validar(EsquemaCodigo, forma({ codigo: "772 200" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.codigo).toBe("772200");
  });

  it("rechaza letras", () => {
    expect(validar(EsquemaCodigo, forma({ codigo: "dddddd" })).ok).toBe(false);
    expect(validar(EsquemaCodigo, forma({ codigo: "12a456" })).ok).toBe(false);
  });

  it("rechaza largos distintos de seis", () => {
    expect(validar(EsquemaCodigo, forma({ codigo: "12345" })).ok).toBe(false);
    expect(validar(EsquemaCodigo, forma({ codigo: "1234567" })).ok).toBe(false);
  });
});

describe("EsquemaLogin", () => {
  it("normaliza el correo a minúsculas y sin espacios", () => {
    const r = validar(EsquemaLogin, forma({ email: "  Erick@Hotmail.com ", password: "x" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.email).toBe("erick@hotmail.com");
  });
});

describe("EsquemaGasto", () => {
  const base = {
    propiedadId: "p1",
    descripcion: "Cemento",
    categoria: "material",
    metodo: "efectivo",
    monto: "1500",
  };

  it("acepta un gasto normal", () => {
    expect(validar(EsquemaGasto, forma(base)).ok).toBe(true);
  });

  it("rechaza montos en cero, negativos o que no son número", () => {
    expect(validar(EsquemaGasto, forma({ ...base, monto: "0" })).ok).toBe(false);
    expect(validar(EsquemaGasto, forma({ ...base, monto: "-5" })).ok).toBe(false);
    expect(validar(EsquemaGasto, forma({ ...base, monto: "mucho" })).ok).toBe(false);
  });

  it("rechaza una categoría que no existe", () => {
    expect(validar(EsquemaGasto, forma({ ...base, categoria: "inventada" })).ok).toBe(false);
  });
});
