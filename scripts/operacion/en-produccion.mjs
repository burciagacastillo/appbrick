// Corre un comando contra la base y el almacén de PRODUCCIÓN (Supabase),
// desde tu computadora, sin tocar tu configuración local.
//
//   npm run prod:verificar   → revisa que todo esté bien configurado
//   npm run prod:migrar      → crea o actualiza las tablas
//   npm run prod:sembrar     → carga el catálogo de 34 y tus 4 propiedades
//   npm run prod:usuario     → crea tu cuenta o cambia la contraseña
//
// Lee .env.produccion (fuera de git). Sus valores GANAN sobre los de .env:
// así un mismo comando nunca escribe en local creyendo que es producción,
// ni al revés.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

const ARCHIVO = ".env.produccion";

if (!existsSync(ARCHIVO)) {
  console.error(
    `\nFalta el archivo ${ARCHIVO}.\n` +
      `Cópialo de produccion.ejemplo.env y llénalo con los datos de Supabase.\n`
  );
  process.exit(1);
}

const valores = parse(readFileSync(ARCHIVO));

const faltan = ["DATABASE_URL", "DIRECT_URL", "APPBRICK_LLAVE_CIFRADO"].filter(
  (k) => !valores[k]
);
if (faltan.length) {
  console.error(`\nEn ${ARCHIVO} faltan: ${faltan.join(", ")}\n`);
  process.exit(1);
}

// Candado: si por error DATABASE_URL apunta a tu computadora, no seguimos.
if (/localhost|127\.0\.0\.1/.test(valores.DATABASE_URL)) {
  console.error(
    `\n${ARCHIVO} apunta a localhost. Eso no es producción: revisa las direcciones de Supabase.\n`
  );
  process.exit(1);
}

const [comando, ...args] = process.argv.slice(2);
if (!comando) {
  console.error("Uso: node scripts/operacion/en-produccion.mjs <comando> [args]");
  process.exit(1);
}

console.log(`\n→ PRODUCCIÓN (${new URL(valores.DATABASE_URL).hostname})\n`);

const r = spawnSync(comando, args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...valores, APPBRICK_ENTORNO: "produccion" },
});

process.exit(r.status ?? 1);
