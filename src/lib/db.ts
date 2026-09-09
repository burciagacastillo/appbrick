import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Único lugar donde se construye la conexión.
// Para migrar a Supabase: cambiar este adapter por PrismaPg y el provider en
// schema.prisma. Ni un archivo más de la app se entera.
export function crearPrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en el .env");

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// En desarrollo Next.js recarga los módulos en caliente; sin este singleton
// se abrirían decenas de conexiones a la base.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? crearPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
