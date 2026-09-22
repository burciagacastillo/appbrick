import { db } from "./db";

// Freno de fuerza bruta.
//
// Protege el login y el código del segundo factor. Vive en la base (tabla
// IntentoAcceso) y no en memoria: en la nube cada petición puede caer en un
// servidor distinto, y en memoria cada uno llevaría su propia cuenta — el
// límite real se multiplicaría por el número de servidores.

export type Veredicto =
  | { permitido: true }
  | { permitido: false; segundosRestantes: number };

/**
 * Consulta si una clave puede intentar otra vez. No gasta intento.
 * Claves: "login:correo@x.com", "2fa:<usuarioId>".
 */
export async function puedeIntentar(clave: string): Promise<Veredicto> {
  const r = await db.intentoAcceso.findUnique({ where: { clave } });
  if (!r?.bloqueadoHasta) return { permitido: true };

  const ahora = Date.now();
  const hasta = r.bloqueadoHasta.getTime();

  if (ahora < hasta) {
    return { permitido: false, segundosRestantes: Math.ceil((hasta - ahora) / 1000) };
  }

  // Solo se borra el historial si HUBO un bloqueo y ya venció.
  //
  // La versión en memoria tuvo aquí un bug que encontraron las pruebas: la
  // condición también se cumplía cuando todavía no había bloqueo, así que
  // cada consulta borraba los intentos y el freno no se activaba nunca.
  await db.intentoAcceso.delete({ where: { clave } }).catch(() => {});
  return { permitido: true };
}

/** Cuenta un intento fallido y arma el bloqueo cuando toca. */
export async function registrarFallo(
  clave: string,
  opciones: { maximo?: number; minutosBloqueo?: number } = {}
): Promise<void> {
  const maximo = opciones.maximo ?? 5;
  const bloqueoMs = (opciones.minutosBloqueo ?? 15) * 60_000;

  // Incremento atómico: dos intentos simultáneos no se pisan la cuenta.
  const r = await db.intentoAcceso.upsert({
    where: { clave },
    update: { intentos: { increment: 1 } },
    create: { clave, intentos: 1 },
  });

  if (r.intentos >= maximo && !r.bloqueadoHasta) {
    await db.intentoAcceso.update({
      where: { clave },
      data: { bloqueadoHasta: new Date(Date.now() + bloqueoMs) },
    });
  }
}

/** Un ingreso correcto borra el historial de esa clave. */
export async function limpiarIntentos(clave: string): Promise<void> {
  await db.intentoAcceso.deleteMany({ where: { clave } });
}

/** Solo para las pruebas. */
export async function reiniciarLimitador(prefijo = ""): Promise<void> {
  await db.intentoAcceso.deleteMany({
    where: prefijo ? { clave: { startsWith: prefijo } } : {},
  });
}
