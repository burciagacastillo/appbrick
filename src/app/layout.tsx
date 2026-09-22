import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es-MX" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        {children}
      </body>
    </html>
  );
}
