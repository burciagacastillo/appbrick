import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leer } from "@/lib/almacen";
import { usuarioActual } from "@/lib/sesion";
import { exige2fa } from "@/lib/permisos";
import { tipoReal, esImagen } from "@/lib/tipos-archivo";

// Fotos de las propiedades. Dos públicos distintos:
//   · Casa PUBLICADA → cualquiera la ve (es el catálogo), con caché larga.
//   · Casa SIN publicar → solo el admin, y sin caché: una foto de una casa
//     que todavía no publicas no debe ser adivinable por URL ni quedarse
//     guardada en ningún intermediario.
// Antes solo existía el primer caso, y la pestaña Publicar enseñaba fotos
// rotas justo cuando más las necesitabas: antes de publicar.

async function esAdminVerificado() {
  const usuario = await usuarioActual();
  if (!usuario?.esAdmin) return false;
  return !exige2fa() || usuario.mfaVerificado;
}

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const foto = await db.foto.findUnique({
    where: { id },
    include: { propiedad: { select: { publicada: true } } },
  });

  const publica = Boolean(foto?.propiedad.publicada);
  if (!foto || (!publica && !(await esAdminVerificado()))) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  let contenido: Buffer;
  try {
    contenido = await leer(foto.archivo);
  } catch {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  // El tipo sale de los bytes, no de la extensión del archivo guardado.
  const real = tipoReal(contenido);
  if (!real || !esImagen(real.tipo)) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": real.tipo,
      "Cache-Control": publica
        ? "public, max-age=31536000, immutable"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
