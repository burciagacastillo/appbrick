import { describe, it, expect } from "vitest";
import { db } from "./db";

// Supabase publica toda tabla de "public" por su API con la llave "anon".
// Una tabla sin RLS queda abierta a internet para leer, cambiar y borrar
// (aviso de Supabase del 27/09/2026). La migración 20261001000000 cerró las
// que había; esta prueba atrapa la próxima tabla nueva que se olvide.

describe("base cerrada a la API pública de Supabase", () => {
  it("todas las tablas tienen RLS", async () => {
    const sinCandado = await db.$queryRaw<{ tabla: string }[]>`
      SELECT c.relname AS tabla FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
      ORDER BY 1`;

    // Si falla: la migración que creó la tabla necesita
    //   ALTER TABLE "Tabla" ENABLE ROW LEVEL SECURITY;
    expect(sinCandado.map((t) => t.tabla)).toEqual([]);
  });

  it("la app sigue leyendo con RLS prendido", async () => {
    // Prisma entra como dueña de las tablas (o con BYPASSRLS): RLS sin
    // políticas no la frena. Si esto da 0, el candado dejó afuera a la app.
    expect(await db.tramiteCatalogo.count()).toBeGreaterThan(0);
  });
});
