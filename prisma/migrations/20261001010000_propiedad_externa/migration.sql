-- Propiedades propias o externas (pedido de Erick del 01/10/2026).
-- Externa: la casa no es suya; cobra por trámite, asesoría, avalúo o
-- adecuaciones. No lleva valor de compra; su utilidad es cobro - gastos.
-- Todas las que ya existen nacen "propia", que es lo que eran.
-- (Solo columnas nuevas: la tabla ya tiene RLS desde 20261001000000.)
ALTER TABLE "Propiedad" ADD COLUMN "modalidad" TEXT NOT NULL DEFAULT 'propia';
ALTER TABLE "Propiedad" ADD COLUMN "cobroCliente" DOUBLE PRECISION;
