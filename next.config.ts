import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las respuestas.
//
// Referrer-Policy es la que más importa aquí: el token de invitación viaja en
// la URL, y sin esta cabecera se filtraría a cualquier sitio externo al que el
// comprador diera clic desde su portal.
const CABECERAS = [
  // Nadie nos mete en un iframe para engañar clics del administrador.
  { key: "X-Frame-Options", value: "DENY" },
  // El navegador respeta el Content-Type que mandamos y no lo adivina.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Al salir hacia otro dominio solo se manda el origen, nunca la ruta.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No hacen falta cámara, micrófono ni ubicación en ninguna pantalla.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS }];
  },
};

export default nextConfig;
