// Da de alta un usuario de AppBrick (admin o ayudante).
//   npm run usuario
//
// La contraseña se teclea aquí, en tu terminal: no se guarda en ningún
// archivo, no pasa por el historial del shell y nadie más la ve. En la base
// solo queda su hash con scrypt, del que no se puede volver atrás.
import "dotenv/config";
import { createInterface } from "node:readline";
import { crearPrisma } from "../../src/lib/db";
import { hashearPassword } from "../../src/lib/sesion";

const db = crearPrisma();

function preguntar(texto: string, oculto = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  if (oculto) {
    // Apaga el eco para que la contraseña no aparezca en pantalla.
    const salida = rl as unknown as { output: NodeJS.WriteStream; _writeToOutput: (s: string) => void };
    salida._writeToOutput = function (s: string) {
      if (s.includes(texto)) salida.output.write(s);
      else salida.output.write("*");
    };
  }

  return new Promise((resolver) =>
    rl.question(texto, (respuesta) => {
      if (oculto) process.stdout.write("\n");
      rl.close();
      resolver(respuesta.trim());
    })
  );
}

async function main() {
  console.log("\nAlta de usuario de AppBrick\n");

  const email = (await preguntar("Correo: ")).toLowerCase();
  if (!email.includes("@")) throw new Error("Ese correo no se ve válido.");

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`\nYa existe ${email} (${existente.rol}).`);
    console.log(`Segundo factor: ${existente.totpActivo ? "activo" : "no configurado"}\n`);
    const r = await preguntar(
      "¿Qué hago? 1) cambiar contraseña  2) reiniciar segundo factor  3) nada: "
    );

    if (r === "2") {
      // La recuperación si pierde el celular. Solo funciona desde esta
      // computadora, con acceso a la base: por internet no hay forma.
      await db.usuario.update({
        where: { email },
        data: { totpSecretoCifrado: null, totpActivo: false, totpUltimoPaso: null },
      });
      await db.bitacora.create({
        data: {
          tipoActor: "sistema",
          actor: "npm run usuario",
          accion: "reinicio_2fa",
          entidad: "usuario",
          entidadId: existente.id,
          detalle: `Se reinició el segundo factor de ${email}`,
        },
      });
      console.log("\nListo. Al entrar te va a pedir escanear un QR nuevo.\n");
      return;
    }
    if (r !== "1") {
      console.log("Sin cambios.\n");
      return;
    }
  }

  const nombre = existente?.nombre ?? (await preguntar("Nombre: "));

  let rol = existente?.rol;
  if (!rol) {
    const r = await preguntar("Rol — 1) admin  2) ayudante: ");
    rol = r === "1" ? "admin" : "ayudante";
  }

  const password = await preguntar("Contraseña: ", true);
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }
  const confirmacion = await preguntar("Repítela: ", true);
  if (password !== confirmacion) throw new Error("No coinciden.");

  const passwordHash = await hashearPassword(password);

  await db.usuario.upsert({
    where: { email },
    update: { passwordHash, activo: true },
    create: { email, nombre, rol, passwordHash },
  });

  console.log(`\nListo: ${nombre} <${email}> como ${rol}.`);
  console.log("Entra en http://localhost:3000/entrar\n");

  if (rol === "ayudante") {
    console.log(
      "Recuerda asignarle propiedades desde la app; sin eso no ve nada.\n"
    );
  }
}

main()
  .catch((e) => {
    console.error(`\n${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
