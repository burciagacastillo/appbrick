"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { hashArchivo } from "@/lib/cripto";
import {
  guardar,
  eliminar,
  carpetaDe,
  validarArchivo,
  limpiarNombre,
} from "@/lib/almacen";

// Lo que decide qué ve el mundo. Solo admin.

/** Convierte un título en slug de URL: "Praderas del Sur 1" → "praderas-del-sur-1" */
function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type ResultadoFoto = { ok: true; cuantas: number } | { ok: false; error: string };

/**
 * Sube fotos de una propiedad. Acepta varias de golpe, que es como salen del
 * carrete del celular.
 */
export async function subirFotos(
  _previo: ResultadoFoto | null,
  formData: FormData
): Promise<ResultadoFoto> {
  await exigirAdmin();
  const propiedadId = String(formData.get("propiedadId"));

  const propiedad = await db.propiedad.findUnique({
    where: { id: propiedadId },
    include: { fotos: true },
  });
  if (!propiedad) return { ok: false, error: "No existe esa propiedad." };

  const archivos = formData
    .getAll("fotos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (archivos.length === 0) {
    return { ok: false, error: "No llegó ninguna foto." };
  }

  let orden = propiedad.fotos.length;
  let guardadas = 0;
  const errores: string[] = [];

  for (const archivo of archivos) {
    const contenido = Buffer.from(await archivo.arrayBuffer());

    // Por bytes, y rechazando PDF: el catálogo solo lleva fotos.
    const validez = validarArchivo(contenido, { soloImagenes: true });
    if (!validez.ok) {
      errores.push(`${archivo.name}: ${validez.error}`);
      continue;
    }

    // La misma foto subida dos veces del carrete no se duplica.
    const hash = hashArchivo(contenido);
    const repetida = await db.foto.findFirst({ where: { propiedadId, hash } });
    if (repetida) continue;

    const nombre = limpiarNombre(
      `${aSlug(propiedad.nombre)}-${orden + 1}${validez.extension}`
    );
    const ruta = await guardar(carpetaDe(propiedadId, "fotos"), nombre, contenido, validez.tipo);

    await db.foto.create({
      data: {
        propiedadId,
        archivo: ruta,
        hash,
        // Nunca el nombre interno: puede traer el nombre del vendedor.
        alt: propiedad.tituloPublico ?? "Casa en venta",
        orden,
        // La primera que suba es la portada, hasta que cambie de opinión.
        esPortada: propiedad.fotos.length === 0 && guardadas === 0,
      },
    });

    orden++;
    guardadas++;
  }

  if (guardadas === 0) {
    return { ok: false, error: errores[0] ?? "No se pudo guardar ninguna foto." };
  }

  revalidatePath("/", "layout");
  return { ok: true, cuantas: guardadas };
}

export async function eliminarFoto(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("fotoId"));

  const foto = await db.foto.findUnique({ where: { id } });
  if (!foto) return;

  // Primero la base, luego el disco: si el archivo ya no estaba, el registro
  // se va igual y no queda una foto fantasma en el catálogo.
  await db.foto.delete({ where: { id } });
  try {
    await eliminar(foto.archivo);
  } catch {
    // El archivo ya no existía. Nada que hacer.
  }

  revalidatePath("/", "layout");
}

export async function hacerPortada(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("fotoId"));

  const foto = await db.foto.findUnique({ where: { id } });
  if (!foto) return;

  await db.foto.updateMany({
    where: { propiedadId: foto.propiedadId },
    data: { esPortada: false },
  });
  await db.foto.update({ where: { id }, data: { esPortada: true } });

  revalidatePath("/", "layout");
}

/** Los datos de la ficha pública. Separados a propósito de los confidenciales. */
export async function guardarFichaPublica(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("propiedadId"));

  const texto = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const numero = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : null;
  };
  const activo = (k: string) => formData.get(k) === "on";

  const propiedad = await db.propiedad.findUnique({ where: { id } });
  if (!propiedad) return;

  const titulo = texto("tituloPublico") ?? propiedad.nombre;

  // El slug se fija la primera vez y ya no cambia: si cambiara, los links que
  // ya mandaste por WhatsApp dejarían de funcionar.
  let slug = propiedad.slugPublico;
  if (!slug) {
    const base = aSlug(titulo);
    slug = base;
    let n = 2;
    while (await db.propiedad.findFirst({ where: { slugPublico: slug, NOT: { id } } })) {
      slug = `${base}-${n++}`;
    }
  }

  await db.propiedad.update({
    where: { id },
    data: {
      publicada: activo("publicada"),
      destacada: activo("destacada"),
      slugPublico: slug,
      tituloPublico: titulo,
      descripcionPublica: texto("descripcionPublica"),
      precioPublico: numero("precioPublico"),
      mostrarPrecio: activo("mostrarPrecio"),
      recamaras: numero("recamaras"),
      banos: numero("banos"),
      m2Terreno: numero("m2Terreno"),
      m2Construccion: numero("m2Construccion"),
      cochera: numero("cochera"),
      aceptaInfonavit: activo("aceptaInfonavit"),
      aceptaBancario: activo("aceptaBancario"),
    },
  });

  revalidatePath("/", "layout");
}
