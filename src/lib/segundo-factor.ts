import { db } from "./db";
import { cifrar, descifrar } from "./cripto";
import { generarSecreto } from "./totp";

/**
 * Prepara (o recupera) el secreto del segundo factor sin activarlo.
 *
 * Se activa solo cuando el usuario demuestra que su app genera códigos
 * válidos: un secreto guardado pero sin confirmar no protege nada, y
 * activarlo antes lo podría dejar fuera de su propia cuenta.
 *
 * Vive aquí y no como acción de servidor para no exponerlo como endpoint:
 * solo lo llama la página de activación al pintarse.
 */
export async function prepararSegundoFactor(usuarioId: string): Promise<string | null> {
  const actual = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!actual || actual.totpActivo) return null;

  // Si ya había uno a medio configurar, se reusa: recargar la página no debe
  // invalidar el QR que quizá ya escaneó.
  if (actual.totpSecretoCifrado) return descifrar(actual.totpSecretoCifrado);

  const secreto = generarSecreto();
  await db.usuario.update({
    where: { id: usuarioId },
    data: { totpSecretoCifrado: cifrar(secreto), totpActivo: false, totpUltimoPaso: null },
  });
  return secreto;
}
