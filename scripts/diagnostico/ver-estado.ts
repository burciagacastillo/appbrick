// Radiografía rápida de la base. Correr: npx tsx scripts/ver-estado.ts
import "dotenv/config";
import { crearPrisma } from "../../src/lib/db";

const db = crearPrisma();

async function main() {
  const documentos = await db.documento.findMany({
    include: { tramite: { include: { catalogo: true } } },
    orderBy: { creadoEn: "desc" },
    take: 10,
  });

  console.log("\nDocumentos subidos:");
  if (documentos.length === 0) console.log("  (ninguno)");
  for (const d of documentos) {
    console.log(
      `  [${d.estado}] ${d.nombreArchivo}\n` +
        `      original: ${d.nombreOriginal} · ${d.tamanoBytes} bytes · por ${d.subidoPorTipo}` +
        (d.vigenciaHasta ? `\n      vigente hasta ${d.vigenciaHasta.toLocaleDateString("es-MX")}` : "")
    );
  }

  const bitacora = await db.bitacora.findMany({
    orderBy: { cuando: "desc" },
    take: 8,
  });
  console.log("\nBitácora:");
  for (const b of bitacora) {
    console.log(
      `  ${b.cuando.toLocaleString("es-MX")} · ${b.tipoActor}:${b.actor} · ` +
        `${b.accion} ${b.entidad}` + (b.detalle ? ` · ${b.detalle}` : "")
    );
  }

  const invitaciones = await db.invitacion.findMany({
    include: { persona: true, propiedad: true },
  });
  console.log("\nInvitaciones:");
  for (const i of invitaciones) {
    console.log(
      `  ${i.rol} ${i.persona.nombre} → ${i.propiedad.nombre}\n` +
        `      bloques ${i.bloquesPermitidos} · usada ${i.vecesUsada} vez(ces) · ` +
        `${i.revocada ? "REVOCADA" : "activa"} · aviso ${i.avisoAceptadoEn ? "aceptado" : "pendiente"}`
    );
  }
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
