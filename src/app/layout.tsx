import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter se descarga al compilar y se sirve desde nuestro propio dominio: no
// hay petición a Google cuando entra un visitante.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Layout raíz: solo el armazón. A propósito NO trae menú de navegación.
//
// La app tiene tres caras con públicos distintos y el menú interno no puede
// aparecer en ninguna que no sea la tuya:
//   (interno)/ → admin y ayudante, con menú
//   subir/     → comprador y vendedor, sin nada que los saque de su tarea
//   casas/     → catálogo público, con su propio encabezado
export const metadata: Metadata = {
  title: "Grupo Brick",
  description: "Grupo Brick — Chihuahua",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`h-full antialiased ${inter.variable}`}>
      <body className="flex min-h-full flex-col bg-fondo font-sans text-tinta">
        {children}
      </body>
    </html>
  );
}
