// El CLI de Prisma 7 ya no lee .env por su cuenta (Next.js sí lo hace solo).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Punto único de conexión a la base.
//
// Hoy: SQLite en un archivo local (prisma/dev.db).
// Mañana (Supabase): se cambia el provider a "postgresql" en schema.prisma y
// aquí se usa el adapter de Postgres con la cadena de Supabase. Nada más.
export default defineConfig({
  schema: "prisma/schema.prisma",
  // Usada por el CLI (db push, studio, migrate).
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
