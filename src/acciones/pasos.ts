"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import {
  validar,
  validarOTronar,
  EsquemaPaso,
  EsquemaPasoId,
  EsquemaFechasClave,
} from "@/lib/esquemas";

// Pasos (pendientes) de una propiedad y sus fechas clave. Solo admin: el
// ayudante no ve la agenda. No van a bitácora: no tocan datos personales.

export type ResultadoPaso = { ok: true } | { ok: false; error: string };

function refrescar(propiedadId: string) {
  revalidatePath(`/propiedades/${propiedadId}`);
  revalidatePath("/propiedades");
  revalidatePath("/agenda");
  revalidatePath("/");
}

/** Crea un paso, o lo edita si trae pasoId. */
export async function guardarPaso(
  _previo: ResultadoPaso | null,
  formData: FormData
): Promise<ResultadoPaso> {
  await exigirAdmin();

  const v = validar(EsquemaPaso, formData);
  if (!v.ok) return v;
  const d = v.datos;

  // El trámite ligado tiene que ser de ESTA propiedad: el formulario solo
  // ofrece los suyos, pero un FormData armado a mano podría mandar otro.
  if (d.tramiteId) {
    const tramite = await db.tramite.findFirst({
      where: { id: d.tramiteId, propiedadId: d.propiedadId },
      select: { id: true },
    });
    if (!tramite) return { ok: false, error: "Ese trámite no es de esta propiedad." };
  }

  // Una hora sin día no dice nada: se descarta.
  const datos = { titulo: d.titulo, fecha: d.fecha, hora: d.fecha ? d.hora : null, tramiteId: d.tramiteId };

  if (d.pasoId) {
    const r = await db.paso.updateMany({
      where: { id: d.pasoId, propiedadId: d.propiedadId },
      data: datos,
    });
    if (r.count === 0) return { ok: false, error: "Ese paso ya no existe." };
  } else {
    await db.paso.create({ data: { propiedadId: d.propiedadId, ...datos } });
  }

  refrescar(d.propiedadId);
  return { ok: true };
}

/** Lo marca como hecho, o lo regresa a pendiente. */
export async function alternarPaso(formData: FormData) {
  await exigirAdmin();
  const { pasoId } = validarOTronar(EsquemaPasoId, formData);

  const paso = await db.paso.findUnique({ where: { id: pasoId } });
  if (!paso) return;

  await db.paso.update({
    where: { id: pasoId },
    data: { hecho: !paso.hecho, hechoEn: paso.hecho ? null : new Date() },
  });
  refrescar(paso.propiedadId);
}

export async function borrarPaso(formData: FormData) {
  await exigirAdmin();
  const { pasoId } = validarOTronar(EsquemaPasoId, formData);

  const paso = await db.paso.findUnique({ where: { id: pasoId }, select: { propiedadId: true } });
  if (!paso) return;

  await db.paso.delete({ where: { id: pasoId } });
  refrescar(paso.propiedadId);
}

/** Firma programada y cierre objetivo: las fechas de la propiedad que salen en la agenda. */
export async function guardarFechasClave(formData: FormData) {
  await exigirAdmin();
  const d = validarOTronar(EsquemaFechasClave, formData);

  await db.propiedad.update({
    where: { id: d.propiedadId },
    data: {
      fechaFirmaProgramada: d.fechaFirmaProgramada,
      fechaCierreObjetivo: d.fechaCierreObjetivo,
    },
  });
  refrescar(d.propiedadId);
}
