import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leer } from "@/lib/almacen";

// Fotos del catálogo público. Esto SÍ se sirve sin sesión — es lo único.
// Por eso solo entrega fotos de propiedades marcadas como publicadas: una
// foto de una casa que todavía no publicas no debe ser adivinable por URL.

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const foto = await db.foto.findUnique({
    where: { id },
    include: { propiedad: { select: { publicada: true } } },
  });

  if (!foto || !foto.propiedad.publicada) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  let contenido: Buffer;
  try {
    contenido = await leer(foto.archivo);
  } catch {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  const extension = foto.archivo.toLowerCase().split(".").pop();
  const tipos: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  };

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": tipos[extension ?? ""] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
