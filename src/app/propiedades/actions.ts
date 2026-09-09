"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/** Cambia el estado de un trámite: falta / revisar / completo / no_aplica. */
export async function cambiarEstadoTramite(formData: FormData) {
  const id = String(formData.get("tramiteId"));
  const estado = String(formData.get("estado"));

  if (!["falta", "revisar", "completo", "no_aplica"].includes(estado)) {
    throw new Error(`Estado inválido: ${estado}`);
  }

  await db.tramite.update({
    where: { id },
    data: {
      estado,
      // Marcar completo implica que el documento está; marcarlo en falta lo quita.
      docRecibido: estado === "completo" ? true : estado === "falta" ? false : undefined,
      fechaHecho: estado === "completo" ? new Date() : null,
    },
  });

  revalidatePath("/", "layout");
}

/** Prende o apaga uno de los tres checks del ciclo a/b/c. */
export async function alternarSubdoc(formData: FormData) {
  const id = String(formData.get("tramiteId"));
  const campo = String(formData.get("campo"));

  if (!["docRecibido", "ordenDeCobro", "pagoComprobado"].includes(campo)) {
    throw new Error(`Campo inválido: ${campo}`);
  }

  const actual = await db.tramite.findUnique({ where: { id } });
  if (!actual) throw new Error("Trámite no encontrado");

  const nuevo = !actual[campo as "docRecibido" | "ordenDeCobro" | "pagoComprobado"];
  const data: Record<string, unknown> = { [campo]: nuevo };

  // Si ya está el documento y el pago comprobado, el trámite se da por cerrado
  // solo. Es el 90% de los casos: no tienes que marcar dos cosas.
  const doc = campo === "docRecibido" ? nuevo : actual.docRecibido;
  const pago = campo === "pagoComprobado" ? nuevo : actual.pagoComprobado;
  if (doc && pago && actual.estado !== "no_aplica") {
    data.estado = "completo";
    data.fechaHecho = new Date();
  }

  await db.tramite.update({ where: { id }, data });
  revalidatePath("/", "layout");
}

/** Guarda responsable, fecha límite, costo y notas de un trámite. */
export async function guardarDetalleTramite(formData: FormData) {
  const id = String(formData.get("tramiteId"));
  const responsable = String(formData.get("responsable") ?? "").trim();
  const fechaLimite = String(formData.get("fechaLimite") ?? "").trim();
  const costo = String(formData.get("costo") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();

  await db.tramite.update({
    where: { id },
    data: {
      responsable: responsable || null,
      fechaLimite: fechaLimite ? new Date(`${fechaLimite}T12:00:00`) : null,
      costo: costo ? Number(costo) : null,
      notas: notas || null,
    },
  });

  revalidatePath("/", "layout");
}

/** Alta de un gasto. Es la captura más frecuente, por eso vive suelta. */
export async function agregarGasto(formData: FormData) {
  const propiedadId = String(formData.get("propiedadId"));
  const fecha = String(formData.get("fecha"));
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const categoria = String(formData.get("categoria"));
  const metodo = String(formData.get("metodo"));
  const monto = Number(formData.get("monto"));
  const pagadoPorNombre = String(formData.get("pagadoPor") ?? "").trim();

  if (!descripcion) throw new Error("Falta la descripción del gasto");
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto debe ser mayor a cero");

  // "Quién pagó" se escribe libre; si la persona no existe, se crea. Así no
  // tienes que dar de alta gente antes de poder capturar un gasto.
  let pagadoPorId: string | null = null;
  if (pagadoPorNombre) {
    const existente = await db.persona.findFirst({
      where: { nombre: pagadoPorNombre },
    });
    pagadoPorId =
      existente?.id ??
      (await db.persona.create({ data: { nombre: pagadoPorNombre } })).id;
  }

  await db.gasto.create({
    data: {
      propiedadId,
      fecha: fecha ? new Date(`${fecha}T12:00:00`) : new Date(),
      descripcion,
      categoria,
      metodo,
      monto,
      pagadoPorId,
    },
  });

  revalidatePath("/", "layout");
}

export async function eliminarGasto(formData: FormData) {
  const id = String(formData.get("gastoId"));
  await db.gasto.delete({ where: { id } });
  revalidatePath("/", "layout");
}

/** Datos generales y valores de la propiedad. */
export async function guardarPropiedad(formData: FormData) {
  const id = String(formData.get("propiedadId"));

  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : null;
  };
  const fecha = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? new Date(`${v}T12:00:00`) : null;
  };
  const texto = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };

  await db.propiedad.update({
    where: { id },
    data: {
      nombre: String(formData.get("nombre")).trim(),
      direccion: texto("direccion"),
      colonia: texto("colonia"),
      etapa: String(formData.get("etapa")),
      tipo: String(formData.get("tipo")),
      valorCompra: num("valorCompra"),
      valorVentaEstimado: num("valorVentaEstimado"),
      valorVentaReal: num("valorVentaReal"),
      presupuestoObra: num("presupuestoObra"),
      fechaCierreObjetivo: fecha("fechaCierreObjetivo"),
      carpetaDrive: texto("carpetaDrive"),
      notas: texto("notas"),
    },
  });

  revalidatePath("/", "layout");
}
