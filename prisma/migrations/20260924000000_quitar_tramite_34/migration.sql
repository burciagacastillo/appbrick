-- Quita el trámite 34 "Bonificación" (bloque H): fue un error de dictado.
-- Lo que Erick quería es la constancia de zonificación, que ya es el 21.
--
-- OJO con el orden: Documento -> Tramite tiene ON DELETE CASCADE. Si algún
-- documento colgara del 34, borrar el trámite lo borraría también. Por eso
-- primero se desligan (quedan guardados, sin trámite) y luego se borra.
--
-- Se filtra por NOMBRE además de número: el 34 se reutiliza para la INE del
-- cónyuge del vendedor (migración siguiente), y ese nunca debe borrarse aquí.

UPDATE "Documento"
SET "tramiteId" = NULL
WHERE "tramiteId" IN (
  SELECT t."id" FROM "Tramite" t
  JOIN "TramiteCatalogo" c ON c."id" = t."catalogoId"
  WHERE c."numero" = 34 AND c."nombre" = 'Bonificación'
);

DELETE FROM "Tramite"
WHERE "catalogoId" IN (
  SELECT "id" FROM "TramiteCatalogo" WHERE "numero" = 34 AND "nombre" = 'Bonificación'
);

DELETE FROM "TramiteCatalogo" WHERE "numero" = 34 AND "nombre" = 'Bonificación';
