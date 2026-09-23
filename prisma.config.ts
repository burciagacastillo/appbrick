// El CLI de Prisma 7 ya no lee .env por su cuenta (Next.js sí lo hace solo).
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Conexión que usa el CLI (migraciones, studio, seed).
//
// Con Supabase son DOS direcciones distintas:
//   · DATABASE_URL — el pooler (puerto 6543). La usa la app.
//   · DIRECT_URL   — conexión directa (puerto 5432). La usan las migraciones,
//                    que necesitan una sesión completa que el pooler no da.
// En tu computadora las dos apuntan al mismo Postgres local.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL (o DIRECT_URL) en el .env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
