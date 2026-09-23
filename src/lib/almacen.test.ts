import { describe, it, expect } from "vitest";
import {
  limpiarNombre,
  nombrarConConvencion,
  validarArchivo,
  carpetaDe,
  rutaSegura,
  TAMANO_MAXIMO,
} from "./almacen";

// Estas pruebas cubren la defensa contra archivos subidos por terceros.
// Un fallo aquí no se ve en pantalla: se ve cuando ya escribieron fuera del
// almacén o cuando un .html se ejecutó en el navegador del administrador.

describe("limpiarNombre — defensa contra rutas maliciosas", () => {
  it("no deja escapar de la carpeta con ../", () => {
    expect(limpiarNombre("../../../.env")).not.toContain("..");
    expect(limpiarNombre("../../../.env")).not.toContain("/");
  });

  it("no deja escapar con separadores de Windows", () => {
    const r = limpiarNombre("..\\..\\Windows\\System32\\config");
    expect(r).not.toContain("\\");
    expect(r).not.toContain("..");
  });

  it("quita rutas absolutas", () => {
    expect(limpiarNombre("C:/Users/burci/.env")).not.toContain("/");
    expect(limpiarNombre("C:/Users/burci/.env")).not.toContain(":");
  });

  it("quita bytes de control que engañan al sistema de archivos", () => {
    expect(limpiarNombre("archivo\u0000.pdf")).not.toContain("\u0000");
  });

  it("no empieza con punto: nada de archivos ocultos", () => {
    expect(limpiarNombre(".env")).not.toMatch(/^\./);
  });

  it("colapsa los espacios dobles que deja quitar caracteres", () => {
    // "INE / identificación" pierde la diagonal y dejaba un hueco doble.
    expect(limpiarNombre("INE / identificacion")).toBe("INE identificacion");
  });

  it("corta nombres absurdamente largos", () => {
    expect(limpiarNombre("a".repeat(500)).length).toBeLessThanOrEqual(180);
  });

  it("respeta un nombre normal", () => {
    expect(limpiarNombre("21a - Constancia de zonificacion.pdf")).toBe(
      "21a - Constancia de zonificacion.pdf"
    );
  });
});

describe("rutaSegura — las rutas que se guardan en la base", () => {
  it("siempre con diagonal normal, aunque venga de Windows", () => {
    // Una ruta con "\" guardada en tu computadora no serviría en Supabase ni
    // en el servidor de Vercel.
    expect(rutaSegura("propiedades\\turmalina\\documentos\\8 - INE.pdf")).toBe(
      "propiedades/turmalina/documentos/8 - INE.pdf"
    );
  });

  it("rechaza rutas que se salen del almacén", () => {
    expect(() => rutaSegura("../../.env")).toThrow();
    expect(() => rutaSegura("propiedades/../../.env")).toThrow();
    expect(() => rutaSegura("/etc/passwd")).toThrow();
  });

  it("deja pasar una ruta normal", () => {
    expect(rutaSegura("propiedades/x/fotos/1.jpg")).toBe("propiedades/x/fotos/1.jpg");
  });
});

describe("carpetaDe — el id de la propiedad tampoco es de fiar", () => {
  it("arma la carpeta con diagonales normales en cualquier sistema", () => {
    expect(carpetaDe("turmalina", "documentos")).toBe("propiedades/turmalina/documentos");
  });

  it("no permite armar rutas con un id manipulado", () => {
    const r = carpetaDe("../../otra", "documentos");
    expect(r).not.toContain("..");
  });
});

describe("nombrarConConvencion", () => {
  it("arma el nombre con la convención de las carpetas", () => {
    expect(
      nombrarConConvencion(21, "a", "Constancia de zonificación", "Sierra la Escondida", ".pdf")
    ).toBe("21a - Constancia de zonificacion Sierra la Escondida.pdf");
  });

  it("sin subtipo no mete letra", () => {
    expect(nombrarConConvencion(8, null, "INE", "Turmalina", ".jpg")).toBe(
      "8 - INE Turmalina.jpg"
    );
  });

  it("quita los acentos para que el escáner lo lea igual", () => {
    const r = nombrarConConvencion(3, null, "CURP", "Peña Blanca", ".pdf");
    expect(r).not.toMatch(/[áéíóúñÁÉÍÓÚÑ]/);
  });
});

// --- Firmas de archivo -----------------------------------------------------

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PDF = Buffer.from("%PDF-1.4\n...");
const HTML = Buffer.from("<html><script>alert(1)</script></html>");
const EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);

describe("validarArchivo — se cree a los bytes, no a quien sube", () => {
  it("acepta un JPEG de verdad", () => {
    const r = validarArchivo(JPEG);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tipo).toBe("image/jpeg");
  });

  it("acepta un PNG y un PDF de verdad", () => {
    expect(validarArchivo(PNG).ok).toBe(true);
    expect(validarArchivo(PDF).ok).toBe(true);
  });

  it("RECHAZA un HTML aunque quien lo suba jure que es una foto", () => {
    // Este es el ataque: un .html con JavaScript etiquetado image/jpeg, que
    // al abrirse en la pantalla de revisión correría con la sesión del admin.
    const r = validarArchivo(HTML);
    expect(r.ok).toBe(false);
  });

  it("RECHAZA un ejecutable", () => {
    expect(validarArchivo(EXE).ok).toBe(false);
  });

  it("rechaza un archivo vacío", () => {
    expect(validarArchivo(Buffer.alloc(0)).ok).toBe(false);
  });

  it("rechaza lo que pasa del tamaño máximo", () => {
    const enorme = Buffer.concat([JPEG, Buffer.alloc(TAMANO_MAXIMO)]);
    expect(validarArchivo(enorme).ok).toBe(false);
  });

  it("para el catálogo público rechaza PDF: ahí solo van fotos", () => {
    expect(validarArchivo(PDF, { soloImagenes: true }).ok).toBe(false);
    expect(validarArchivo(JPEG, { soloImagenes: true }).ok).toBe(true);
  });

  it("la extensión sale del tipo real, no del nombre que mandaron", () => {
    const r = validarArchivo(PDF);
    if (r.ok) expect(r.extension).toBe(".pdf");
  });
});
