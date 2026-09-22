// Carga inicial de AppBrick.
//
// Siembra el catálogo de 34 trámites y da de alta las propiedades pendientes
// leyendo directamente tus carpetas. El estado del expediente NO se captura a
// mano: se deduce de los nombres de archivo con src/lib/escaner.ts.
//
// Correr con:  npm run db:seed
// Es idempotente: se puede volver a correr sin duplicar nada.

import "dotenv/config";
import { join } from "node:path";
import { CATALOGO } from "./catalogo";
import { escanearCarpeta } from "../src/lib/escaner";
import { listarArchivosDe } from "../src/lib/almacen";
import { crearPrisma } from "../src/lib/db";

const prisma = crearPrisma();

const BRICK_ROOT =
  process.env.BRICK_ROOT ??
  "C:/1-CLAUDE COWORK/1-BRICK Grupo Inmobiliario/1-GRUPO BRICK";

/** Las propiedades vivas de hoy. Las concluidas se cargan después si se quieren. */
const PENDIENTES: {
  /** Id estable y apto para URL. No cambiarlo: es la liga de las páginas. */
  slug: string;
  carpeta: string;
  nombre: string;
  etapa: string;
  tipo: string;
  notas?: string;
}[] = [
  {
    slug: "nueva-fe-jona",
    carpeta: "pendientes/Nueva fe Jona",
    nombre: "Nueva Fe (Jonathan)",
    etapa: "en_tramite",
    tipo: "casa",
    notas: "Operación con Jonathan. Ver también el proyecto Campovillo.",
  },
  {
    slug: "turmalina",
    carpeta: "pendientes/Turmalina",
    nombre: "Turmalina",
    etapa: "en_tramite",
    tipo: "casa",
    notas: "Vendedora: Claudia. Compradores: Jesús y Luis Martínez.",
  },
  {
    slug: "santiago-almada",
    carpeta: "pendientes/santiago almada gory",
    nombre: "Santiago Almada",
    etapa: "en_tramite",
    tipo: "casa",
    notas: "Escritura a nombre de Miguel Almada.",
  },
  {
    slug: "sierra-la-escondida",
    carpeta: "pendientes/sierra la escondida",
    nombre: "Sierra la Escondida",
    etapa: "en_tramite",
    tipo: "casa",
    notas: "Compradores: Edgar y Maira. Avalúo con Poncho.",
  },
];

async function sembrarCatalogo() {
  for (const item of CATALOGO) {
    // Mismos campos para crear y actualizar: el catálogo es fuente de verdad
    // en código, así que re-sembrar siempre lo deja igual al archivo.
    const campos = {
      bloque: item.bloque,
      bloqueNombre: item.bloqueNombre,
      nombre: item.nombre,
      requierePago: item.requierePago ?? false,
      opcional: item.opcional ?? false,
      esDato: item.esDato ?? false,
      loSubeInvitado: item.loSubeInvitado ?? false,
      vigenciaDias: item.vigenciaDias ?? null,
      dondeSeTramita: item.dondeSeTramita ?? null,
      notasAyuda: item.notasAyuda ?? null,
      ayudaInvitado: item.ayudaInvitado ?? null,
    };

    await prisma.tramiteCatalogo.upsert({
      where: { numero: item.numero },
      update: campos,
      create: { numero: item.numero, ...campos },
    });
  }

  const suben = CATALOGO.filter((c) => c.loSubeInvitado).length;
  const datos = CATALOGO.filter((c) => c.esDato).length;
  const caducan = CATALOGO.filter((c) => c.vigenciaDias).length;
  console.log(
    `  Catálogo: ${CATALOGO.length} trámites · ${suben} los sube el invitado · ` +
      `${datos} son datos · ${caducan} caducan`
  );
}

async function sembrarUsuarios() {
  await prisma.usuario.upsert({
    where: { email: "burciagacastillo@hotmail.com" },
    update: {},
    create: {
      email: "burciagacastillo@hotmail.com",
      nombre: "Erick",
      rol: "admin",
    },
  });
  console.log("  Usuarios: 1 (Erick, admin)");
}

async function sembrarPropiedades() {
  const catalogo = await prisma.tramiteCatalogo.findMany();

  // Solo en estos el sufijo a/b/c significa documento / orden de cobro / pago.
  const conCicloDePago = new Set(
    catalogo.filter((c) => c.requierePago).map((c) => c.numero)
  );

  for (const p of PENDIENTES) {
    const rutaAbs = join(BRICK_ROOT, p.carpeta);
    const archivos = listarArchivosDe(rutaAbs);
    const escaneo = escanearCarpeta(archivos, conCicloDePago);

    const propiedad = await prisma.propiedad.upsert({
      where: { id: p.slug },
      update: { carpetaLocal: rutaAbs, etapa: p.etapa, notas: p.notas ?? null },
      create: {
        id: p.slug,
        nombre: p.nombre,
        etapa: p.etapa,
        tipo: p.tipo,
        carpetaLocal: rutaAbs,
        notas: p.notas ?? null,
      },
    });

    // Todo trámite del catálogo existe para toda propiedad. Lo que cambia es
    // su estado. Así el expediente siempre se ve completo aunque falte todo.
    for (const item of catalogo) {
      const derivado = escaneo.tramites.find((t) => t.numero === item.numero);
      await prisma.tramite.upsert({
        where: {
          propiedadId_catalogoId: { propiedadId: propiedad.id, catalogoId: item.id },
        },
        update: {},
        create: {
          propiedadId: propiedad.id,
          catalogoId: item.id,
          estado: derivado?.estado ?? "falta",
          docRecibido: derivado?.docRecibido ?? false,
          ordenDeCobro: derivado?.ordenDeCobro ?? false,
          pagoComprobado: derivado?.pagoComprobado ?? false,
          archivo: derivado?.archivo ?? null,
          notas: derivado?.notas ?? null,
        },
      });
    }

    const completos = escaneo.tramites.filter((t) => t.estado === "completo").length;
    const revisar = escaneo.tramites.filter((t) => t.estado === "revisar").length;
    console.log(
      `  ${p.nombre.padEnd(22)} ${archivos.length.toString().padStart(2)} archivos → ` +
        `${completos} completos, ${revisar} por revisar, ` +
        `${34 - escaneo.tramites.length} sin archivo` +
        (escaneo.sinClasificar.length
          ? ` · ${escaneo.sinClasificar.length} sin numerar`
          : "")
    );
    if (!archivos.length) {
      console.log(`     ⚠ No se encontró la carpeta: ${rutaAbs}`);
    }
  }
}

async function main() {
  console.log("\nAppBrick — carga inicial\n");
  await sembrarCatalogo();
  await sembrarUsuarios();
  console.log("\n  Propiedades pendientes:");
  await sembrarPropiedades();
  console.log("\nListo.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
