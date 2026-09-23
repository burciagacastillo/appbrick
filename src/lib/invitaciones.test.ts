import { describe, it, expect, afterEach } from "vitest";
import { urlPublica, urlDelPortal, telefonoWhatsApp } from "./invitaciones";

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
