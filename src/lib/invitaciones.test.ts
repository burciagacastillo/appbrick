import { describe, it, expect, afterEach } from "vitest";
import {
  urlPublica,
  urlDelPortal,
  telefonoWhatsApp,
  bloquesDeInvitacion,
  tramitesDelInvitado,
} from "./invitaciones";

// Los links que salen por WhatsApp. Un error aquí no truena: manda al
// comprador un link que no abre.

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("urlPublica", () => {
  it("en tu computadora es localhost", () => {
    delete process.env.APPBRICK_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(urlPublica()).toBe("http://localhost:3000");
  });

  it("publicada en Vercel usa la dirección de producción, con https", () => {
    delete process.env.APPBRICK_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "appbrick.vercel.app";
    expect(urlPublica()).toBe("https://appbrick.vercel.app");
  });

  it("tu dominio propio manda sobre el de Vercel", () => {
    process.env.APPBRICK_URL = "https://casas.grupobrick.mx/";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "appbrick.vercel.app";
    // Y sin la diagonal final, para no armar "//subir".
    expect(urlPublica()).toBe("https://casas.grupobrick.mx");
  });

  it("el link del portal nunca sale con localhost una vez publicada", () => {
    delete process.env.APPBRICK_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "appbrick.vercel.app";
    const link = urlDelPortal("abc123");
    expect(link).toBe("https://appbrick.vercel.app/subir/abc123");
    expect(link).not.toContain("localhost");
  });
});

describe("telefonoWhatsApp", () => {
  it("normaliza los formatos que la gente escribe", () => {
    expect(telefonoWhatsApp("614 496 7308")).toBe("526144967308");
    expect(telefonoWhatsApp("+52 614 496 7308")).toBe("526144967308");
    expect(telefonoWhatsApp("(614) 496-7308")).toBe("526144967308");
    expect(telefonoWhatsApp("5216144967308")).toBe("526144967308");
  });

  it("devuelve null si no se puede, para ocultar el botón", () => {
    expect(telefonoWhatsApp(null)).toBeNull();
    expect(telefonoWhatsApp("123")).toBeNull();
  });
});

describe("bloquesDeInvitacion — qué documentos sube cada link", () => {
  it("comprador y vendedor, cada quien su lado", () => {
    expect(bloquesDeInvitacion("comprador")).toBe("B");
    expect(bloquesDeInvitacion("vendedor")).toBe("A");
  });

  it("con ambos, los dos lados (la compradora que trae los papeles del vendedor)", () => {
    expect(bloquesDeInvitacion("comprador", true)).toBe("A,B");
    expect(bloquesDeInvitacion("vendedor", true)).toBe("A,B");
  });

  it("el contacto (la licenciada de la notaría) siempre los dos", () => {
    expect(bloquesDeInvitacion("contacto")).toBe("A,B");
  });

  it("un link de los dos lados ve los de los dos, y solo los que sube el invitado", () => {
    const t = (bloque: string, loSubeInvitado = true, estado = "falta") => ({
      estado,
      catalogo: { bloque, loSubeInvitado },
    });
    const lista = [t("A"), t("B"), t("C"), t("A", false), t("B", true, "no_aplica")];
    expect(tramitesDelInvitado(lista, bloquesDeInvitacion("contacto"))).toHaveLength(2);
    expect(tramitesDelInvitado(lista, bloquesDeInvitacion("comprador"))).toHaveLength(1);
  });
});
