"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirAdmin } from "@/lib/permisos";
import { registrar } from "@/lib/bitacora";
import { cifrar, descifrar } from "@/lib/cripto";
import {
  validar,
  EsquemaPersona,
  EsquemaReferencias,
  EsquemaVincular,
  EsquemaRevelar,
  EsquemaOperacion,
} from "@/lib/esquemas";

// Datos de las personas de una operación.
//
// Todo exige admin. Aquí vive el NSS, la contraseña del portal Infonavit y
// las referencias: es lo más sensible de la base, y el ayudante no lo ve
// nunca — ni siquiera con acceso a la propiedad.

export type Resultado = { ok: true } | { ok: false; error: string };

function refrescar(propiedadId: string) {
  revalidatePath(`/propiedades/${propiedadId}`);
}

/** Alta y edición de los datos de una persona. */
export async function guardarPersona(
  _previo: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  const admin = await exigirAdmin();

  const v = validar(EsquemaPersona, formData);
  if (!v.ok) return { ok: false, error: v.error };
  const d = v.datos;

  const actual = await db.persona.findUnique({ where: { id: d.personaId } });
  if (!actual) return { ok: false, error: "Esa persona ya no existe." };

  // La contraseña solo se toca si escribieron una nueva. Si llega vacía se
  // conserva la guardada: si no, editar el teléfono la borraría sin avisar.
  let infonavitPasswordCifrada = actual.infonavitPasswordCifrada;
  let cambioPassword = false;

  const nueva = d.infonavitPassword?.trim();
  if (nueva) {
    infonavitPasswordCifrada = cifrar(nueva);
    cambioPassword = true;
  }

  // Si dejó de estar casado, el régimen y el cónyuge ya no aplican.
  const casado = d.estadoCivil === "casado";

  await db.persona.update({
    where: { id: d.personaId },
    data: {
      nombre: d.nombre,
      telefono: d.telefono,
      email: d.email,
      curp: d.curp,
      rfc: d.rfc,
      nss: d.nss,
      domicilio: d.domicilio,
      estadoCivil: d.estadoCivil,
      regimenMatrimonial: casado ? d.regimenMatrimonial : null,
      conyugeNombre: casado ? d.conyugeNombre : null,
      empleador: d.empleador,
      puesto: d.puesto,
      antiguedadMeses: d.antiguedadMeses,
      ingresoMensual: d.ingresoMensual,
      numeroCredito: d.numeroCredito,
      infonavitUsuario: d.infonavitUsuario,
      infonavitPasswordCifrada,
    },
  });

  if (cambioPassword) {
    await registrar({
      tipoActor: "admin",
      actor: admin.nombre,
      accion: "guardo_password",
      entidad: "persona",
      entidadId: d.personaId,
      detalle: `Se guardó la contraseña de Infonavit de ${d.nombre}`,
    });
  }

  // El trámite 13 (NSS y contraseña) depende de estos datos.
  await sincronizarTramitesDeDatos(d.propiedadId);

  refrescar(d.propiedadId);
  return { ok: true };
}

/** Borra la contraseña guardada, sin tocar nada más. */
export async function borrarPassword(formData: FormData) {
  const admin = await exigirAdmin();
  const personaId = String(formData.get("personaId") ?? "");
  const propiedadId = String(formData.get("propiedadId") ?? "");
  if (!personaId) return;

  const persona = await db.persona.update({
    where: { id: personaId },
    data: { infonavitPasswordCifrada: null },
  });

  await registrar({
    tipoActor: "admin",
    actor: admin.nombre,
    accion: "borro_password",
    entidad: "persona",
    entidadId: personaId,
    detalle: `Se borró la contraseña de Infonavit de ${persona.nombre}`,
  });

  if (propiedadId) refrescar(propiedadId);
}

export type ResultadoRevelar =
  | { ok: true; password: string }
  | { ok: false; error: string };

/**
 * Descifra y devuelve la contraseña de Infonavit.
 *
 * Es la única función de la app que saca un secreto en claro, así que está
 * separada a propósito: exige admin, se invoca solo cuando lo pides, y CADA
 * consulta queda registrada con tu nombre y la fecha. Si algún día alguien
 * pregunta quién vio qué, la respuesta está en la bitácora.
 */
export async function revelarPassword(
  _previo: ResultadoRevelar | null,
  formData: FormData
): Promise<ResultadoRevelar> {
  const admin = await exigirAdmin();

  const v = validar(EsquemaRevelar, formData);
  if (!v.ok) return { ok: false, error: v.error };

  const persona = await db.persona.findUnique({
    where: { id: v.datos.personaId },
  });
  if (!persona?.infonavitPasswordCifrada) {
    return { ok: false, error: "Esta persona no tiene contraseña guardada." };
  }

  let password: string;
  try {
    password = descifrar(persona.infonavitPasswordCifrada);
  } catch {
    // Pasa si cambió la llave de cifrado o si alguien alteró la base.
    return {
      ok: false,
      error:
        "No se pudo descifrar. Puede que la llave del .env haya cambiado; habrá que volver a capturarla.",
    };
  }

  await registrar({
    tipoActor: "admin",
    actor: admin.nombre,
    accion: "revelo_password",
    entidad: "persona",
    entidadId: persona.id,
    detalle: `Consultó la contraseña de Infonavit de ${persona.nombre}`,
  });

  return { ok: true, password };
}

/** Las dos referencias de la solicitud de crédito (trámites 18 y 19). */
export async function guardarReferencias(
  _previo: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  await exigirAdmin();

  const v = validar(EsquemaReferencias, formData);
  if (!v.ok) return { ok: false, error: v.error };
  const d = v.datos;

  const pares = [
    { orden: 1, nombre: d.nombre1, telefono: d.telefono1, parentesco: d.parentesco1 },
    { orden: 2, nombre: d.nombre2, telefono: d.telefono2, parentesco: d.parentesco2 },
  ];

  for (const r of pares) {
    if (!r.nombre) {
      // Sin nombre no hay referencia: si la borraron, se borra.
      await db.referencia.deleteMany({
        where: { personaId: d.personaId, orden: r.orden },
      });
      continue;
    }

    await db.referencia.upsert({
      where: { personaId_orden: { personaId: d.personaId, orden: r.orden } },
      update: { nombre: r.nombre, telefono: r.telefono, parentesco: r.parentesco },
      create: {
        personaId: d.personaId,
        orden: r.orden,
        nombre: r.nombre,
        telefono: r.telefono,
        parentesco: r.parentesco,
      },
    });
  }

  // Los trámites 18 y 19 se marcan solos según haya referencia o no.
  await sincronizarTramitesDeDatos(d.propiedadId);

  refrescar(d.propiedadId);
  return { ok: true };
}

/** Agrega una persona a la propiedad con su papel. */
export async function vincularPersona(
  _previo: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  await exigirAdmin();

  const v = validar(EsquemaVincular, formData);
  if (!v.ok) return { ok: false, error: v.error };
  const { propiedadId, nombre, telefono, rol } = v.datos;

  // Mismo criterio que en las invitaciones: el nombre solo no identifica a
  // nadie. Con teléfono la coincidencia es fiable; sin él, se desambigua.
  let persona = telefono
    ? await db.persona.findFirst({ where: { nombre, telefono } })
    : null;

  if (!persona) {
    const mismoNombre = await db.persona.findMany({ where: { nombre } });

    if (mismoNombre.length === 1 && !telefono) {
      persona = mismoNombre[0];
    } else if (mismoNombre.length > 1 && !telefono) {
      return {
        ok: false,
        error: `Ya hay ${mismoNombre.length} personas llamadas "${nombre}". Pon su teléfono para no confundirlas.`,
      };
    } else {
      persona = await db.persona.create({
        data: { nombre, telefono: telefono ?? null },
      });
    }
  }

  const yaEsta = await db.propiedadPersona.findFirst({
    where: { propiedadId, personaId: persona.id, rol },
  });
  if (yaEsta) {
    return { ok: false, error: `${nombre} ya está como ${rol} en esta propiedad.` };
  }

  await db.propiedadPersona.create({
    data: { propiedadId, personaId: persona.id, rol },
  });

  refrescar(propiedadId);
  return { ok: true };
}

export async function desvincularPersona(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("vinculoId") ?? "");
  if (!id) return;

  // Se quita de la propiedad, pero la persona sigue existiendo: sus datos
  // pueden estar ligados a otra operación.
  const vinculo = await db.propiedadPersona.delete({ where: { id } });
  refrescar(vinculo.propiedadId);
}

/** Datos de la operación que no pertenecen a una persona sino al trato. */
export async function guardarOperacion(
  _previo: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  await exigirAdmin();

  const v = validar(EsquemaOperacion, formData);
  if (!v.ok) return { ok: false, error: v.error };
  const d = v.datos;

  await db.propiedad.update({
    where: { id: d.propiedadId },
    data: {
      notaria: d.notaria,
      fechaFirmaProgramada: d.fechaFirmaProgramada,
      saldoCreditoVendedor: d.saldoCreditoVendedor,
      montoCreditoComprador: d.montoCreditoComprador,
      enganche: d.enganche,
    },
  });

  refrescar(d.propiedadId);
  return { ok: true };
}

/**
 * Pone al día los trámites que son DATO y no archivo (13, 18 y 19).
 *
 * Esos tres no se suben: se capturan. Antes la app pedía subirles un PDF,
 * que es algo que nadie tiene. Ahora su estado sale de si el dato existe.
 */
export async function sincronizarTramitesDeDatos(propiedadId: string) {
  const [compradores, tramites] = await Promise.all([
    db.propiedadPersona.findMany({
      where: { propiedadId, rol: "comprador" },
      include: { persona: { include: { referencias: true } } },
    }),
    db.tramite.findMany({
      where: { propiedadId, catalogo: { esDato: true } },
      include: { catalogo: true },
    }),
  ]);

  const comprador = compradores[0]?.persona;

  for (const t of tramites) {
    // "no_aplica" es decisión tuya y no se pisa.
    if (t.estado === "no_aplica") continue;

    let completo = false;
    if (t.catalogo.numero === 13) {
      completo = Boolean(comprador?.nss && comprador?.infonavitPasswordCifrada);
    } else if (t.catalogo.numero === 18) {
      completo = Boolean(comprador?.referencias.some((r) => r.orden === 1));
    } else if (t.catalogo.numero === 19) {
      completo = Boolean(comprador?.referencias.some((r) => r.orden === 2));
    }

    const estado = completo ? "completo" : "falta";
    if (t.estado !== estado) {
      await db.tramite.update({
        where: { id: t.id },
        data: { estado, fechaHecho: completo ? new Date() : null },
      });
    }
  }
}
