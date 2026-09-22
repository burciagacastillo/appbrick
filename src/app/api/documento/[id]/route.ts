import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/sesion";
import { puedeVerPropiedad } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";
import { leer } from "@/lib/almacen";

// Entrega de un documento del expediente. NUNCA se sirven estos archivos
// como estáticos: cada descarga pasa por aquí para verificar permiso y dejar
// rastro. Un documento contiene la INE o el acta de nacimiento de alguien.

export async function GET(
  peticion: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ?descargar=1 baja el archivo; sin eso se abre dentro del navegador.
  const descargar = new URL(peticion.url).searchParams.get("descargar") === "1";

  const usuario = await usuarioActual();
  if (!usuario) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const documento = await db.documento.findUnique({
    where: { id },
    include: { propiedad: { select: { id: true, nombre: true } } },
  });
  if (!documento) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  // El ayudante solo ve documentos de las propiedades que se le asignaron.
  if (!(await puedeVerPropiedad(usuario, documento.propiedadId))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let contenido: Buffer;
  try {
    contenido = await leer(documento.ruta);
  } catch {
    // El registro existe pero el archivo no está: se avisa en vez de tronar.
    return NextResponse.json(
      { error: "El archivo no se encontró en el almacén" },
      { status: 410 }
    );
  }

  await registrar({
    tipoActor: usuario.esAdmin ? "admin" : "ayudante",
    actor: usuario.nombre,
    accion: "descargo",
    entidad: "documento",
    entidadId: documento.id,
    detalle: `${documento.nombreArchivo} — ${documento.propiedad.nombre}`,
  });

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": documento.mimeType,
      // inline: se abre en el navegador en vez de bajarse de golpe.
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${encodeURIComponent(documento.nombreArchivo)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
