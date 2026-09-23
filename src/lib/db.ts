import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Único lugar donde se construye la conexión. Postgres en todos lados:
//   · En tu computadora: el Postgres local de `npx prisma dev`.
//   · Publicada: Supabase, por su "pooler" (DATABASE_URL, puerto 6543).
//
// El pooler importa en la nube: cada petición puede levantar un servidor
// nuevo, y sin él cada uno abriría sus propias conexiones hasta agotar las
// que permite el plan gratis.

export function crearPrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en el .env");

  // Conexiones por servidor. Por defecto UNA, por dos razones:
  //  · En Vercel cada petición puede levantar su propio servidor, y todos
  //    comparten el límite de conexiones de Supabase. Con varias por
  //    servidor, un pico de visitas lo agota y la app deja de responder.
  //  · El Postgres local de `prisma dev` solo acepta una conexión a la vez;
  //    con más, corta las sobrantes ("Connection terminated unexpectedly").
  // Las consultas en paralelo simplemente esperan su turno: para el tamaño
  // de esta app no se nota.
  const max = Number(process.env.DATABASE_POOL_MAX ?? 1);

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, max }),
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
