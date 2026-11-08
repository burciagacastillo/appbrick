-- Pasos (pendientes) de cada propiedad: el "siguiente paso", la agenda
-- "Esta semana" y el calendario. Pedido de Erick del 08/11/2026.
--
-- Tabla nueva = RLS en la misma migración (si no, la API pública de
-- Supabase la dejaría abierta; seguridad-bd.test.ts lo vigila).

-- CreateTable
CREATE TABLE "Paso" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3),
    "hora" TEXT,
    "hecho" BOOLEAN NOT NULL DEFAULT false,
    "hechoEn" TIMESTAMP(3),
    "tramiteId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Paso_propiedadId_hecho_idx" ON "Paso"("propiedadId", "hecho");

-- CreateIndex
CREATE INDEX "Paso_fecha_idx" ON "Paso"("fecha");

-- AddForeignKey
ALTER TABLE "Paso" ADD CONSTRAINT "Paso_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paso" ADD CONSTRAINT "Paso_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Candado: la API pública de Supabase no ve esta tabla.
ALTER TABLE "Paso" ENABLE ROW LEVEL SECURITY;
