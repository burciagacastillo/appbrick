import { describe, it, expect } from "vitest";
import { EsquemaCodigo, EsquemaLogin, EsquemaGasto, EsquemaVincular, EsquemaPersona, validar } from "./esquemas";

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

describe("EsquemaVincular — agregar persona con sus datos del trámite", () => {
  const base = { propiedadId: "turmalina", nombre: "Edgar Vázquez", rol: "comprador" };

  it("guarda el NSS limpio aunque lo escriban con espacios o guiones", () => {
    const r = validar(EsquemaVincular, forma({ ...base, nss: "123 4567-8901" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.nss).toBe("12345678901");
  });

  it("recibe crédito, estado civil, régimen y cónyuge", () => {
    const r = validar(
      EsquemaVincular,
      forma({
        ...base,
        numeroCredito: "1234567890",
        estadoCivil: "casado",
        regimenMatrimonial: "bienes_mancomunados",
        conyugeNombre: "Maira López",
      })
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.estadoCivil).toBe("casado");
      expect(r.datos.regimenMatrimonial).toBe("bienes_mancomunados");
      expect(r.datos.conyugeNombre).toBe("Maira López");
    }
  });

  it("todo lo del trámite es opcional: basta nombre y papel", () => {
    const r = validar(EsquemaVincular, forma(base));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.nss).toBeNull();
      expect(r.datos.estadoCivil).toBeNull();
    }
  });

  it("rechaza un régimen o estado civil inventado", () => {
    expect(validar(EsquemaVincular, forma({ ...base, regimenMatrimonial: "otro" })).ok).toBe(false);
    expect(validar(EsquemaVincular, forma({ ...base, estadoCivil: "complicado" })).ok).toBe(false);
  });
});

describe("EsquemaPersona — el NSS también se limpia al editar", () => {
  it("quita espacios y guiones", () => {
    const r = validar(
      EsquemaPersona,
      forma({ personaId: "p1", propiedadId: "turmalina", nombre: "Edgar", nss: "12-345 678 901" })
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.nss).toBe("12345678901");
  });
});
