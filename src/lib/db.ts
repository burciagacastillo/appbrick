import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Único lugar donde se construye la conexión.
//
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
const global_ = globalThis as unknown as { prisma?: PrismaClient };

function instancia(): PrismaClient {
  if (!global_.prisma) global_.prisma = crearPrisma();
  return global_.prisma;
}

/**
 * Cliente de Prisma, conectado en el primer uso y no al importar.
 *
 * POR QUÉ EL PROXY: antes esto era `export const db = crearPrisma()`, que se
 * ejecuta en cuanto alguien importa el módulo — aunque sea de rebote, como
 * hacía una prueba de criptografía que solo quería hashear contraseñas. Eso
 * obligaba a tener DATABASE_URL para cosas que no tocan la base, y abría la
 * conexión antes de necesitarla.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_destino, propiedad) {
    const cliente = instancia() as unknown as Record<string | symbol, unknown>;
    const valor = cliente[propiedad];
    return typeof valor === "function" ? valor.bind(cliente) : valor;
  },
});
