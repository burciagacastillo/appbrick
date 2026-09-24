"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";
import { etapa as buscarEtapa } from "@/lib/constants";
import { idUnico } from "@/lib/slug";
import {
  validar,
  validarOTronar,
  EsquemaEtapa,
  EsquemaNuevaPropiedad,
  EsquemaEstadoTramite,
  EsquemaSubdoc,
  EsquemaDetalleTramite,
  EsquemaGasto,
  EsquemaPropiedad,
} from "@/lib/esquemas";

/**
 * Invalida solo lo que de verdad cambió.
 *
 * Antes todas las acciones llamaban revalidatePath("/", "layout"), que tira el
 * cache de TODA la app en cada clic. Con 4 propiedades no se nota; con 50 y el
 * asistente trabajando en paralelo, cada marca de trámite recalcula todo.
 */
function refrescarPropiedad(propiedadId: string) {
  revalidatePath(`/propiedades/${propiedadId}`);
  revalidatePath("/propiedades");
  revalidatePath("/");
}

/** Mueve la propiedad de fase con un toque, desde la línea de fases de su ficha. */
export async function cambiarEtapa(formData: FormData) {
  const usuario = await exigirAdmin();
  const { propiedadId, etapa } = validarOTronar(EsquemaEtapa, formData);

  const antes = await db.propiedad.findUnique({
    where: { id: propiedadId },
    select: { etapa: true, nombre: true },
  });
  if (!antes || antes.etapa === etapa) return;

  await db.propiedad.update({ where: { id: propiedadId }, data: { etapa } });

  await registrar({
    tipoActor: "admin",
    actor: usuario.nombre,
    accion: "cambio_etapa",
    entidad: "propiedad",
    entidadId: propiedadId,
    detalle: `${antes.nombre}: ${buscarEtapa(antes.etapa).label} → ${buscarEtapa(etapa).label}`,
  });

  refrescarPropiedad(propiedadId);
}

/** Cambia el estado de un trámite: falta / revisar / completo / no_aplica. */
export async function cambiarEstadoTramite(formData: FormData) {
  const usuario = await exigirAdmin();
  const { tramiteId, estado } = validarOTronar(EsquemaEstadoTramite, formData);

  const tramite = await db.tramite.update({
    where: { id: tramiteId },
    data: {
      estado,
      // Marcar completo implica que el documento está; marcarlo en falta lo quita.
      docRecibido: estado === "completo" ? true : estado === "falta" ? false : undefined,
      fechaHecho: estado === "completo" ? new Date() : null,
      actualizadoPorId: usuario.id,
    },
  });

  refrescarPropiedad(tramite.propiedadId);
}

/** Prende o apaga uno de los tres checks del ciclo a/b/c. */
export async function alternarSubdoc(formData: FormData) {
  const usuario = await exigirAdmin();
  const { tramiteId, campo } = validarOTronar(EsquemaSubdoc, formData);

  const actual = await db.tramite.findUnique({ where: { id: tramiteId } });
  if (!actual) throw new Error("Trámite no encontrado");

  const nuevo = !actual[campo];
  const data: Record<string, unknown> = { [campo]: nuevo, actualizadoPorId: usuario.id };

  // Si ya está el documento y el pago comprobado, el trámite se da por cerrado
  // solo. Es el 90% de los casos: no tienes que marcar dos cosas.
  const doc = campo === "docRecibido" ? nuevo : actual.docRecibido;
  const pago = campo === "pagoComprobado" ? nuevo : actual.pagoComprobado;
  if (doc && pago && actual.estado !== "no_aplica") {
    data.estado = "completo";
    data.fechaHecho = new Date();
  }

  await db.tramite.update({ where: { id: tramiteId }, data });
  refrescarPropiedad(actual.propiedadId);
}

/** Guarda responsable, fecha límite, costo y notas de un trámite. */
export async function guardarDetalleTramite(formData: FormData) {
  await exigirAdmin();
  const d = validarOTronar(EsquemaDetalleTramite, formData);

  const tramite = await db.tramite.update({
    where: { id: d.tramiteId },
    data: {
      responsable: d.responsable,
      fechaLimite: d.fechaLimite,
      costo: d.costo,
      notas: d.notas,
    },
  });

  refrescarPropiedad(tramite.propiedadId);
}

export type ResultadoGasto = { ok: true } | { ok: false; error: string };

/**
 * Alta de un gasto.
 *
 * Sobre "quién pagó": antes se buscaba a la persona por nombre y, si existía
 * una con ese nombre, se reutilizaba. Con dos "José García" —normal en este
 * volumen— el segundo heredaba el CURP y el crédito del primero. Ahora, si hay
 * más de una coincidencia, se avisa en vez de adivinar.
 */
export async function agregarGasto(
  _previo: ResultadoGasto | null,
  formData: FormData
): Promise<ResultadoGasto> {
  const usuario = await exigirAdmin();

  const v = validar(EsquemaGasto, formData);
  if (!v.ok) return { ok: false, error: v.error };
  const d = v.datos;

  let pagadoPorId: string | null = null;
  if (d.pagadoPor) {
    const candidatos = await db.persona.findMany({
      where: { nombre: d.pagadoPor },
      select: { id: true },
    });

    if (candidatos.length > 1) {
      return {
        ok: false,
        error: `Hay varias personas llamadas "${d.pagadoPor}". Regístralo desde la ficha de la persona para no confundirlas.`,
      };
    }

    pagadoPorId =
      candidatos[0]?.id ??
      (await db.persona.create({ data: { nombre: d.pagadoPor } })).id;
  }

  await db.gasto.create({
    data: {
      propiedadId: d.propiedadId,
      fecha: d.fecha ?? new Date(),
      descripcion: d.descripcion,
      categoria: d.categoria,
      metodo: d.metodo,
      monto: d.monto,
      pagadoPorId,
      registradoPorId: usuario.id,
    },
  });

  refrescarPropiedad(d.propiedadId);
  revalidatePath("/gastos");
  return { ok: true };
}

export async function eliminarGasto(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("gastoId") ?? "");
  if (!id) return;

  const gasto = await db.gasto.delete({ where: { id } });

  refrescarPropiedad(gasto.propiedadId);
  revalidatePath("/gastos");
}

/** Datos generales y valores de la propiedad. */
export async function guardarPropiedad(formData: FormData) {
  await exigirAdmin();
  const d = validarOTronar(EsquemaPropiedad, formData);

  await db.propiedad.update({
    where: { id: d.propiedadId },
    data: {
      nombre: d.nombre,
      direccion: d.direccion,
      colonia: d.colonia,
      etapa: d.etapa,
      tipo: d.tipo,
      valorCompra: d.valorCompra,
      valorVentaEstimado: d.valorVentaEstimado,
      valorVentaReal: d.valorVentaReal,
      presupuestoObra: d.presupuestoObra,
      fechaCierreObjetivo: d.fechaCierreObjetivo,
      carpetaDrive: d.carpetaDrive,
      notas: d.notas,
    },
  });

  refrescarPropiedad(d.propiedadId);
  revalidatePath("/casas");
}

// ---------------------------------------------------------------------------
// Alta de propiedades
// ---------------------------------------------------------------------------

export type ResultadoNuevaPropiedad = { ok: false; error: string } | null;

/**
 * Da de alta una propiedad con su expediente completo (los 34 trámites en
 * "falta"), igual que las que vinieron de tus carpetas. El id sale del nombre
 * ("Praderas 12" → "praderas-12") porque es la liga de sus páginas; si ya
 * existe, se le agrega un número.
 */
export async function crearPropiedad(
  _previo: ResultadoNuevaPropiedad,
  formData: FormData
): Promise<ResultadoNuevaPropiedad> {
  const usuario = await exigirAdmin();

  const v = validar(EsquemaNuevaPropiedad, formData);
  if (!v.ok) return { ok: false, error: v.error };
  const d = v.datos;

  const id = await idUnico(d.nombre, async (candidato) =>
    Boolean(await db.propiedad.findUnique({ where: { id: candidato }, select: { id: true } }))
  );

  const catalogo = await db.tramiteCatalogo.findMany({ select: { id: true } });

  // Una sola operación: o se crea con sus 34 trámites, o no se crea.
  await db.propiedad.create({
    data: {
      id,
      nombre: d.nombre,
      direccion: d.direccion,
      colonia: d.colonia,
      ciudad: d.ciudad,
      tipo: d.tipo,
      etapa: d.etapa,
      valorCompra: d.valorCompra,
      notas: d.notas,
      tramites: { create: catalogo.map((c) => ({ catalogoId: c.id, estado: "falta" })) },
    },
  });

  await registrar({
    tipoActor: "admin",
    actor: usuario.nombre,
    accion: "creo_propiedad",
    entidad: "propiedad",
    entidadId: id,
    detalle: d.nombre,
  });

  revalidatePath("/propiedades");
  revalidatePath("/");
  redirect(`/propiedades/${encodeURIComponent(id)}`);
}
