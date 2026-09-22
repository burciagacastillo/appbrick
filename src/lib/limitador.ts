// Freno de fuerza bruta.
//
// La cuenta de admin descifra credenciales de terceros y solo la protege una
// contraseña. Sin freno, un script prueba miles por minuto.
//
// En memoria: alcanza mientras la app corra en un solo proceso. Al migrar a
// Supabase hay que moverlo a una tabla, porque con varias instancias cada una
// llevaría su propia cuenta y el límite real se multiplicaría.

type Registro = { intentos: number; bloqueadoHasta: number };

const registros = new Map<string, Registro>();

/** Se limpia de vez en cuando para que el Map no crezca sin fin. */
let ultimaLimpieza = Date.now();
const LIMPIAR_CADA = 10 * 60_000;

function limpiarViejos(ahora: number) {
  if (ahora - ultimaLimpieza < LIMPIAR_CADA) return;
  ultimaLimpieza = ahora;
  for (const [clave, r] of registros) {
    if (r.bloqueadoHasta < ahora - LIMPIAR_CADA) registros.delete(clave);
  }
}

export type Veredicto =
  | { permitido: true }
  | { permitido: false; segundosRestantes: number };

/**
 * Consulta si una clave (por ejemplo, un correo) puede intentar otra vez.
 * No consume intento: solo pregunta.
 */
export function puedeIntentar(clave: string): Veredicto {
  const ahora = Date.now();
  limpiarViejos(ahora);

  const r = registros.get(clave);
  if (!r) return { permitido: true };

  const bloqueado = r.bloqueadoHasta > 0;

  if (bloqueado && ahora < r.bloqueadoHasta) {
    return {
      permitido: false,
      segundosRestantes: Math.ceil((r.bloqueadoHasta - ahora) / 1000),
    };
  }

  // Solo se borra el historial si HUBO un bloqueo y ya venció.
  //
  // Antes esta condición era `ahora >= r.bloqueadoHasta`, que también se
  // cumple cuando bloqueadoHasta vale 0 — es decir, cuando todavía no hay
  // bloqueo. El efecto: cada consulta borraba los intentos acumulados y el
  // freno no llegaba a activarse nunca. Lo encontraron las pruebas.
  if (bloqueado && ahora >= r.bloqueadoHasta) registros.delete(clave);

  return { permitido: true };
}

/** Cuenta un intento fallido y arma el bloqueo cuando toca. */
export function registrarFallo(
  clave: string,
  opciones: { maximo?: number; minutosBloqueo?: number } = {}
) {
  const maximo = opciones.maximo ?? 5;
  const bloqueo = (opciones.minutosBloqueo ?? 15) * 60_000;
  const ahora = Date.now();

  const r = registros.get(clave) ?? { intentos: 0, bloqueadoHasta: 0 };
  r.intentos++;
  if (r.intentos >= maximo) r.bloqueadoHasta = ahora + bloqueo;
  registros.set(clave, r);
}

/** Un ingreso correcto borra el historial de esa clave. */
export function limpiarIntentos(clave: string) {
  registros.delete(clave);
}

/** Solo para las pruebas: deja el limitador como recién arrancado. */
export function reiniciarLimitador() {
  registros.clear();
  ultimaLimpieza = Date.now();
}
