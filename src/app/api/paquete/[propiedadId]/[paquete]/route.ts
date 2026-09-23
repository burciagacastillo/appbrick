import { NextResponse } from "next/server";
import { posix } from "node:path";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/sesion";
import { exige2fa } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";
import {
  leer,
  carpetaDe,
  limpiarNombre,
  guardarReemplazando,
  enlaceTemporal,
} from "@/lib/almacen";
import { paquete as buscarPaquete, armarPaquete, unirEnPdf } from "@/lib/paquetes";

// Arma el paquete (p. ej. el del avalúo) como UN PDF, en el orden exacto.
// Solo admin: junta en un archivo las identificaciones de dos personas.
//
// Publicada, el PDF armado se guarda en Supabase y se entrega por un link que
// caduca: una escritura sola ya pasa de los 4.5 MB que Vercel deja salir.

// Unir una escritura de 50 MB puede tardar; el máximo del plan gratis.
export const maxDuration = 300;

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ propiedadId: string; paquete: string }> }
) {
  const { propiedadId, paquete: idPaquete } = await params;

  const usuario = await usuarioActual();
  if (!usuario?.esAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (exige2fa() && !usuario.mfaVerificado) {
    return NextResponse.json({ error: "Activa tu segundo factor" }, { status: 401 });
  }

  const p = buscarPaquete(idPaquete);
  const propiedad = await db.propiedad.findUnique({
    where: { id: propiedadId },
    select: { id: true, nombre: true },
  });
  if (!p || !propiedad) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  const tramites = await db.tramite.findMany({
    where: { propiedadId },
    include: { catalogo: true, documentos: true },
  });
  const piezas = armarPaquete(p, tramites);
  const documentos = piezas.flatMap((pz) => pz.documentos);

  if (documentos.length === 0) {
    return NextResponse.json(
      { error: "Todavía no hay ningún documento de este paquete." },
      { status: 404 }
    );
  }

  const entradas = [];
  for (const d of documentos) {
    try {
      entradas.push({ contenido: await leer(d.ruta), tipo: d.mimeType, nombre: d.nombreArchivo });
    } catch {
      // Si un archivo se perdió del almacén, el paquete sale sin él.
    }
  }
  const { pdf, paginas } = await unirEnPdf(entradas);

  const nombre = limpiarNombre(`${p.nombre} - ${propiedad.nombre}.pdf`);
  const faltan = piezas.filter((pz) => pz.documentos.length === 0 && !pz.noAplica).length;

  await registrar({
    tipoActor: "admin",
    actor: usuario.nombre,
    accion: "descargo",
    entidad: "propiedad",
    entidadId: propiedad.id,
    detalle: `Paquete ${p.nombre} — ${propiedad.nombre} · ${documentos.length} documentos, ${paginas} hojas${
      faltan ? ` · faltaron ${faltan}` : ""
    }`,
  });

  const ruta = posix.join(carpetaDe(propiedad.id, "paquetes"), `${p.id}.pdf`);
  const guardado = await guardarReemplazando(ruta, pdf, "application/pdf");
  const enlace = await enlaceTemporal(guardado, { descargarComo: nombre });

  if (enlace) {
    return NextResponse.redirect(enlace, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(nombre)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
