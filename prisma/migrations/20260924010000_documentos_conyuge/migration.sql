-- Documentos del cónyuge (definido por Erick el 24/09/2026): si el vendedor
-- o el comprador es casado, sea cual sea el régimen, se piden los documentos
-- de su cónyuge. 34-37 cónyuge del vendedor; 38 acta de matrimonio del
-- comprador; 39-42 cónyuge del comprador. El acta del vendedor sigue en el 6.
--
-- Los textos deben coincidir con prisma/catalogo.ts (fuente de verdad): así
-- prod:sembrar no cambia nada después de esta migración.

INSERT INTO "TramiteCatalogo"
  ("id", "numero", "bloque", "bloqueNombre", "nombre", "loSubeInvitado", "dondeSeTramita", "notasAyuda", "ayudaInvitado")
VALUES
  (md5('conyuge-34' || random()::text), 34, 'A', 'Vendedor', 'INE del cónyuge', true, NULL, NULL,
   'La credencial de elector de tu esposa o esposo, por los dos lados.'),
  (md5('conyuge-35' || random()::text), 35, 'A', 'Vendedor', 'CURP del cónyuge', true, NULL, NULL,
   'La CURP de tu esposa o esposo. Se descarga gratis en gob.mx/curp.'),
  (md5('conyuge-36' || random()::text), 36, 'A', 'Vendedor', 'RFC / situación fiscal del cónyuge', true, 'SAT', NULL,
   'La Constancia de Situación Fiscal de tu esposa o esposo. Se saca en el portal del SAT.'),
  (md5('conyuge-37' || random()::text), 37, 'A', 'Vendedor', 'Acta de nacimiento del cónyuge', true, NULL, NULL,
   'El acta de nacimiento de tu esposa o esposo. Sirve la de gob.mx.'),
  (md5('conyuge-38' || random()::text), 38, 'B', 'Comprador / Derechohabiente', 'Acta de matrimonio', true, NULL,
   'Solo si el comprador es casado. Se abre sola al capturarlo en Personas.',
   'Tu acta de matrimonio. Sirve la copia certificada o la de gob.mx.'),
  (md5('conyuge-39' || random()::text), 39, 'B', 'Comprador / Derechohabiente', 'INE del cónyuge', true, NULL, NULL,
   'La credencial de elector de tu esposa o esposo, por los dos lados.'),
  (md5('conyuge-40' || random()::text), 40, 'B', 'Comprador / Derechohabiente', 'CURP del cónyuge', true, NULL, NULL,
   'La CURP de tu esposa o esposo. Se descarga gratis en gob.mx/curp.'),
  (md5('conyuge-41' || random()::text), 41, 'B', 'Comprador / Derechohabiente', 'RFC / situación fiscal del cónyuge', true, 'SAT', NULL,
   'La Constancia de Situación Fiscal de tu esposa o esposo. Se saca en el portal del SAT.'),
  (md5('conyuge-42' || random()::text), 42, 'B', 'Comprador / Derechohabiente', 'Acta de nacimiento del cónyuge', true, NULL, NULL,
   'El acta de nacimiento de tu esposa o esposo. Sirve la de gob.mx.')
ON CONFLICT ("numero") DO NOTHING;

-- El 6 (acta de matrimonio del vendedor) deja de ser "opcional": ahora se
-- abre y se cierra solo según el estado civil.
UPDATE "TramiteCatalogo"
SET "opcional" = false,
    "notasAyuda" = 'Solo si el vendedor es casado. Se abre sola al capturarlo en Personas.',
    "ayudaInvitado" = 'Tu acta de matrimonio. Sirve la copia certificada o la de gob.mx.'
WHERE "numero" = 6;

-- Un trámite por propiedad para cada documento nuevo: abierto ('falta') si
-- ese lado ya está capturado como casado, cerrado ('no_aplica') si no.
INSERT INTO "Tramite" ("id", "propiedadId", "catalogoId", "estado", "actualizadoEn")
SELECT
  md5(p."id" || c."id" || random()::text),
  p."id",
  c."id",
  CASE WHEN EXISTS (
    SELECT 1 FROM "PropiedadPersona" pp
    JOIN "Persona" pe ON pe."id" = pp."personaId"
    WHERE pp."propiedadId" = p."id"
      AND pe."estadoCivil" = 'casado'
      AND pp."rol" = CASE WHEN c."numero" <= 37 THEN 'vendedor' ELSE 'comprador' END
  ) THEN 'falta' ELSE 'no_aplica' END,
  CURRENT_TIMESTAMP
FROM "Propiedad" p
CROSS JOIN "TramiteCatalogo" c
WHERE c."numero" BETWEEN 34 AND 42
ON CONFLICT ("propiedadId", "catalogoId") DO NOTHING;

-- El 6 se cierra donde el vendedor no es casado, si no tiene nada subido.
UPDATE "Tramite" t
SET "estado" = 'no_aplica', "actualizadoEn" = CURRENT_TIMESTAMP
FROM "TramiteCatalogo" c
WHERE c."id" = t."catalogoId"
  AND c."numero" = 6
  AND t."estado" = 'falta'
  AND NOT EXISTS (
    SELECT 1 FROM "Documento" d WHERE d."tramiteId" = t."id" AND d."estado" <> 'rechazado'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "PropiedadPersona" pp
    JOIN "Persona" pe ON pe."id" = pp."personaId"
    WHERE pp."propiedadId" = t."propiedadId" AND pp."rol" = 'vendedor' AND pe."estadoCivil" = 'casado'
  );
