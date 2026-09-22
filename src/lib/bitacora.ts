import { db } from "./db";

// Registro de quién hizo qué. Con documentos de identidad de terceros en la
// base, esto es lo que te respalda si alguien reclama "yo nunca subí eso" o
// "quién vio mis papeles".
//
// Nunca falla hacia afuera: si la bitácora se cae, la operación del usuario
// sigue. Preferimos perder un renglón de registro antes que bloquear una
// subida legítima — pero se avisa en consola para que no pase desapercibido.

export type TipoActor = "admin" | "ayudante" | "invitado" | "sistema";

export type Accion =
  | "subio"
  | "aprobo"
  | "rechazo"
  | "descargo"
  | "elimino"
  | "revelo_password"
  | "creo_invitacion"
  | "revoco_invitacion"
  | "acepto_aviso"
  | "entro"
  | "corrigio_fecha"
  | "vio_expediente";

export type Entidad =
  | "documento"
  | "tramite"
  | "persona"
  | "propiedad"
  | "invitacion"
  | "usuario";

export async function registrar(evento: {
  tipoActor: TipoActor;
  actor: string;
  accion: Accion;
  entidad: Entidad;
  entidadId?: string;
  detalle?: string;
}): Promise<void> {
  try {
    await db.bitacora.create({
      data: {
        tipoActor: evento.tipoActor,
        actor: evento.actor,
        accion: evento.accion,
        entidad: evento.entidad,
        entidadId: evento.entidadId ?? null,
        detalle: evento.detalle ?? null,
      },
    });
  } catch (e) {
    console.error("[bitacora] no se pudo registrar el evento:", evento, e);
  }
}

/** Los últimos movimientos, para la pantalla de auditoría del admin. */
export async function ultimosMovimientos(limite = 100) {
  return db.bitacora.findMany({
    orderBy: { cuando: "desc" },
    take: limite,
  });
}
