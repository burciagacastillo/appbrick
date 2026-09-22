// Crea una invitación de prueba para ver el portal del invitado.
//   npx tsx scripts/invitacion-demo.ts
//
// Usa a Edgar (comprador real de Sierra la Escondida) si existe; si no, lo crea.
import "dotenv/config";
import { crearPrisma } from "../src/lib/db";
import { crearInvitacion, urlDelPortal, mensajeWhatsApp } from "../src/lib/invitaciones";

const db = crearPrisma();

async function main() {
  const propiedad = await db.propiedad.findFirst({
    where: { id: "sierra-la-escondida" },
  });
  if (!propiedad) throw new Error("No existe la propiedad sierra-la-escondida");

  let persona = await db.persona.findFirst({
    where: { nombre: "Edgar Gedeón Vázquez Alvarado" },
  });
  if (!persona) {
    persona = await db.persona.create({
      data: {
        nombre: "Edgar Gedeón Vázquez Alvarado",
        telefono: "614 000 0000",
        nss: "12345678901",
      },
    });
  }

  await db.propiedadPersona.upsert({
    where: {
      propiedadId_personaId_rol: {
        propiedadId: propiedad.id,
        personaId: persona.id,
        rol: "comprador",
      },
    },
    update: {},
    create: { propiedadId: propiedad.id, personaId: persona.id, rol: "comprador" },
  });

  const invitacion = await crearInvitacion({
    propiedadId: propiedad.id,
    personaId: persona.id,
    rol: "comprador",
    creadaPor: "Erick",
  });

  const url = urlDelPortal(invitacion.token);
  console.log("\nPortal del comprador:\n");
  console.log(url);
  console.log("\nMensaje listo para WhatsApp:\n");
  console.log(
    mensajeWhatsApp({
      nombre: persona.nombre,
      propiedad: propiedad.nombre,
      url,
      faltantes: 7,
    })
  );
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
