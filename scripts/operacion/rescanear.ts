// Re-escanea las carpetas y actualiza el expediente SIN borrar nada.
//
// Correr cada vez que metas documentos nuevos a una carpeta:
//   npm run rescan
//
// Regla de oro: el escáner nunca baja de nivel lo que tú marcaste a mano.
// Solo puede subir (falta → revisar → completo) y llenar el nombre del archivo.
// Así puedes marcar algo como completo aunque el PDF todavía no exista, y el
// re-escaneo no te lo va a deshacer.

import "dotenv/config";
import { crearPrisma } from "../../src/lib/db";
import { escanearCarpeta } from "../../src/lib/escaner";
import { listarArchivosDe } from "../../src/lib/almacen";

const prisma = crearPrisma();

const NIVEL = { falta: 0, revisar: 1, completo: 2, no_aplica: 3 } as const;

async function main() {
  const propiedades = await prisma.propiedad.findMany({
    where: { carpetaLocal: { not: null } },
    include: { tramites: { include: { catalogo: true } } },
  });

  const catalogo = await prisma.tramiteCatalogo.findMany();
  const conCicloDePago = new Set(
    catalogo.filter((c) => c.requierePago).map((c) => c.numero)
  );

  console.log("\nRe-escaneo de carpetas\n");

  for (const p of propiedades) {
    const archivos = listarArchivosDe(p.carpetaLocal!);
    if (archivos.length === 0) {
      console.log(`  ${p.nombre}: carpeta vacía o no encontrada — se omite`);
      continue;
    }

    const escaneo = escanearCarpeta(archivos, conCicloDePago);
    let cambios = 0;

    for (const t of p.tramites) {
      const d = escaneo.tramites.find((x) => x.numero === t.catalogo.numero);
      if (!d) continue;

      const nivelActual = NIVEL[t.estado as keyof typeof NIVEL] ?? 0;
      const nivelNuevo = NIVEL[d.estado];

      const data: Record<string, unknown> = {};

      // El estado solo sube, nunca baja. "no_aplica" es decisión tuya y se respeta.
      if (t.estado !== "no_aplica" && nivelNuevo > nivelActual) {
        data.estado = d.estado;
      }
      // Las banderas a/b/c solo se prenden desde el archivo, nunca se apagan.
      if (d.docRecibido && !t.docRecibido) data.docRecibido = true;
      if (d.ordenDeCobro && !t.ordenDeCobro) data.ordenDeCobro = true;
      if (d.pagoComprobado && !t.pagoComprobado) data.pagoComprobado = true;
      // El nombre del archivo sí se refresca siempre: es dato, no criterio.
      if (d.archivo && d.archivo !== t.archivo) data.archivo = d.archivo;

      if (Object.keys(data).length > 0) {
        await prisma.tramite.update({ where: { id: t.id }, data });
        cambios++;
      }
    }

    const partes = [`${archivos.length} archivos`, `${cambios} trámites actualizados`];
    if (escaneo.sinClasificar.length) {
      partes.push(`${escaneo.sinClasificar.length} archivos sin numerar`);
    }
    console.log(`  ${p.nombre.padEnd(22)} ${partes.join(" · ")}`);

    if (escaneo.sinClasificar.length) {
      for (const f of escaneo.sinClasificar) console.log(`     · ${f}`);
    }
  }

  console.log("\nListo.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
