// Revisión antes de publicar. Corre con:  npm run prod:verificar
//
// No cambia nada: solo mira y te dice qué falta, en orden. La revisión más
// importante es la del bucket: si quedara PÚBLICO, cualquiera con la
// dirección de un archivo podría ver las INE de tus compradores.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { crearPrisma } from "../../src/lib/db";
import { cifrar, descifrar } from "../../src/lib/cripto";

type Resultado = { ok: boolean; titulo: string; detalle?: string };
const resultados: Resultado[] = [];

function anotar(ok: boolean, titulo: string, detalle?: string) {
  resultados.push({ ok, titulo, detalle });
}

async function main() {
  console.log("\nRevisión de producción\n");

  // --- Llave de cifrado ---------------------------------------------------
  const llave = process.env.APPBRICK_LLAVE_CIFRADO ?? "";
  if (llave.length < 32) {
    anotar(false, "Llave de cifrado", "Falta o es muy corta. Genera una con: npm run llave");
  } else {
    try {
      const prueba = descifrar(cifrar("prueba"));
      anotar(prueba === "prueba", "Llave de cifrado", "Cifra y descifra bien");
    } catch (e) {
      anotar(false, "Llave de cifrado", String(e));
    }
  }

  // --- Base de datos -----------------------------------------------------
  const db = crearPrisma();
  try {
    await db.$queryRaw`SELECT 1`;
    anotar(true, "Conexión a la base", new URL(process.env.DATABASE_URL!).hostname);

    const catalogo = await db.tramiteCatalogo.count();
    anotar(
      catalogo === 34,
      "Catálogo de 34 trámites",
      catalogo === 34 ? "Completo" : `Hay ${catalogo}. Corre: npm run prod:sembrar`
    );

    const admins = await db.usuario.findMany({ where: { rol: "admin", activo: true } });
    const conPassword = admins.filter((a) => a.passwordHash);
    anotar(
      conPassword.length > 0,
      "Cuenta de administrador",
      conPassword.length > 0
        ? conPassword.map((a) => a.email).join(", ")
        : "Ningún admin tiene contraseña. Corre: npm run prod:usuario"
    );

    const conDosFactores = conPassword.filter((a) => a.totpActivo);
    // Ojo con el caso vacío: sin cuentas, "activo en todas" es verdad
    // técnicamente y mentira para quien lo lee.
    anotar(
      true,
      "Segundo factor",
      conPassword.length === 0
        ? "Pendiente: primero crea tu cuenta"
        : conDosFactores.length === conPassword.length
          ? "Activo en todas las cuentas de admin"
          : "Se te va a pedir activarlo la primera vez que entres (es obligatorio)"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    anotar(
      false,
      "Conexión a la base",
      /does not exist|relation/i.test(msg)
        ? "Conecta, pero faltan las tablas. Corre: npm run prod:migrar"
        : `No conecta. Revisa DATABASE_URL y la contraseña. (${msg.split("\n")[0]})`
    );
  } finally {
    await db.$disconnect();
  }

  // --- Almacén de documentos -----------------------------------------------
  const url = process.env.SUPABASE_URL;
  const llaveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.APPBRICK_BUCKET ?? "almacen";

  if (!url || !llaveServicio) {
    anotar(false, "Almacén de documentos", "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  } else {
    const sb = createClient(url, llaveServicio, { auth: { persistSession: false } });
    const { data, error } = await sb.storage.getBucket(bucket);

    if (error || !data) {
      anotar(
        false,
        `Bucket "${bucket}"`,
        `No existe. En Supabase: Storage → New bucket → "${bucket}" → privado`
      );
    } else if (data.public) {
      anotar(
        false,
        `Bucket "${bucket}" es PÚBLICO`,
        "PELIGRO: cualquiera con la dirección vería las INE. Storage → el bucket → Edit → desactiva 'Public bucket'"
      );
    } else {
      // Prueba real de escritura, lectura y borrado.
      const ruta = `_verificacion/${Date.now()}.txt`;
      const subida = await sb.storage
        .from(bucket)
        .upload(ruta, Buffer.from("ok"), { contentType: "text/plain" });
      const bajada = subida.error ? null : await sb.storage.from(bucket).download(ruta);
      await sb.storage.from(bucket).remove([ruta]);

      anotar(
        !subida.error && !bajada?.error,
        `Bucket "${bucket}"`,
        subida.error
          ? `No deja escribir: ${subida.error.message}`
          : "Privado, y se puede escribir, leer y borrar"
      );
    }
  }

  // --- Reporte -----------------------------------------------------------
  for (const r of resultados) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.titulo}${r.detalle ? ` — ${r.detalle}` : ""}`);
  }

  const fallas = resultados.filter((r) => !r.ok).length;
  console.log(
    fallas === 0
      ? "\nTodo listo para publicar.\n"
      : `\n${fallas} ${fallas === 1 ? "cosa por arreglar" : "cosas por arreglar"} antes de publicar.\n`
  );
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
