-- Cierra la base a la API pública de Supabase (PostgREST).
--
-- Supabase publica cada tabla de "public" por internet: con la dirección del
-- proyecto y la llave "anon" se podía leer, cambiar y borrar todo (aviso de
-- Supabase del 27/09/2026: rls_disabled_in_public, sensitive_columns_exposed).
-- La app NO usa esa API: entra por Prisma como "postgres", que brinca RLS.
--
-- 1. RLS en todas las tablas, sin políticas: para la API, ninguna fila existe.
-- 2. Sin permisos para anon y authenticated, ni en las tablas de hoy ni en las
--    que creen las migraciones futuras.
--
-- En el Postgres local no existen anon ni authenticated: solo aplica el paso 1.
-- Toda tabla nueva necesita su ENABLE ROW LEVEL SECURITY en su migración;
-- src/lib/seguridad-bd.test.ts falla si alguna queda sin candado.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon', 'authenticated')) = 2 THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  END IF;
END $$;
