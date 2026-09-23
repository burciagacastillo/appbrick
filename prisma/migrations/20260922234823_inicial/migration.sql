-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'ayudante',
    "passwordHash" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totpSecretoCifrado" TEXT,
    "totpActivo" BOOLEAN NOT NULL DEFAULT false,
    "totpUltimoPaso" INTEGER,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesoAyudante" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3),

    CONSTRAINT "AccesoAyudante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitacion" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "bloquesPermitidos" TEXT NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3),
    "revocada" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAcceso" TIMESTAMP(3),
    "vecesUsada" INTEGER NOT NULL DEFAULT 0,
    "avisoAceptadoEn" TIMESTAMP(3),

    CONSTRAINT "Invitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentoAcceso" (
    "clave" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntentoAcceso_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "Bitacora" (
    "id" TEXT NOT NULL,
    "cuando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoActor" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" TEXT,

    CONSTRAINT "Bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "curp" TEXT,
    "rfc" TEXT,
    "nss" TEXT,
    "estadoCivil" TEXT,
    "regimenMatrimonial" TEXT,
    "conyugeNombre" TEXT,
    "domicilio" TEXT,
    "empleador" TEXT,
    "puesto" TEXT,
    "antiguedadMeses" INTEGER,
    "ingresoMensual" DOUBLE PRECISION,
    "numeroCredito" TEXT,
    "infonavitUsuario" TEXT,
    "infonavitPasswordCifrada" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referencia" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "parentesco" TEXT,

    CONSTRAINT "Referencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropiedadPersona" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "porcentaje" DOUBLE PRECISION,
    "notas" TEXT,

    CONSTRAINT "PropiedadPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Propiedad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "colonia" TEXT,
    "ciudad" TEXT NOT NULL DEFAULT 'Chihuahua',
    "etapa" TEXT NOT NULL DEFAULT 'prospecto',
    "tipo" TEXT NOT NULL DEFAULT 'casa',
    "carpetaLocal" TEXT,
    "carpetaDrive" TEXT,
    "valorCompra" DOUBLE PRECISION,
    "valorVentaEstimado" DOUBLE PRECISION,
    "valorVentaReal" DOUBLE PRECISION,
    "presupuestoObra" DOUBLE PRECISION,
    "saldoCreditoVendedor" DOUBLE PRECISION,
    "montoCreditoComprador" DOUBLE PRECISION,
    "enganche" DOUBLE PRECISION,
    "notaria" TEXT,
    "fechaFirmaProgramada" TIMESTAMP(3),
    "fechaCompra" TIMESTAMP(3),
    "fechaVenta" TIMESTAMP(3),
    "fechaCierreObjetivo" TIMESTAMP(3),
    "notas" TEXT,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "destacada" BOOLEAN NOT NULL DEFAULT false,
    "slugPublico" TEXT,
    "tituloPublico" TEXT,
    "descripcionPublica" TEXT,
    "precioPublico" DOUBLE PRECISION,
    "mostrarPrecio" BOOLEAN NOT NULL DEFAULT true,
    "recamaras" INTEGER,
    "banos" DOUBLE PRECISION,
    "m2Terreno" DOUBLE PRECISION,
    "m2Construccion" DOUBLE PRECISION,
    "cochera" INTEGER,
    "aceptaInfonavit" BOOLEAN NOT NULL DEFAULT true,
    "aceptaBancario" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propiedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "alt" TEXT,
    "hash" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "esPortada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TramiteCatalogo" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "bloque" TEXT NOT NULL,
    "bloqueNombre" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "requierePago" BOOLEAN NOT NULL DEFAULT false,
    "opcional" BOOLEAN NOT NULL DEFAULT false,
    "esDato" BOOLEAN NOT NULL DEFAULT false,
    "loSubeInvitado" BOOLEAN NOT NULL DEFAULT false,
    "vigenciaDias" INTEGER,
    "dondeSeTramita" TEXT,
    "notasAyuda" TEXT,
    "ayudaInvitado" TEXT,

    CONSTRAINT "TramiteCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tramite" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "catalogoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'falta',
    "docRecibido" BOOLEAN NOT NULL DEFAULT false,
    "ordenDeCobro" BOOLEAN NOT NULL DEFAULT false,
    "pagoComprobado" BOOLEAN NOT NULL DEFAULT false,
    "costo" DOUBLE PRECISION,
    "archivo" TEXT,
    "archivoUrl" TEXT,
    "responsable" TEXT,
    "fechaLimite" TIMESTAMP(3),
    "fechaHecho" TIMESTAMP(3),
    "notas" TEXT,
    "actualizadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tramite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "tramiteId" TEXT,
    "subTipo" TEXT,
    "nombreOriginal" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "hash" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "motivoRechazo" TEXT,
    "fechaDocumento" TIMESTAMP(3),
    "vigenciaHasta" TIMESTAMP(3),
    "subidoPorTipo" TEXT NOT NULL,
    "subidoPorUsuarioId" TEXT,
    "subidoPorInvitacionId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "pagadoPorId" TEXT,
    "comprobante" TEXT,
    "comprobanteUrl" TEXT,
    "notas" TEXT,
    "registradoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaPresupuesto" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "notas" TEXT,

    CONSTRAINT "PartidaPresupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AccesoAyudante_usuarioId_propiedadId_key" ON "AccesoAyudante"("usuarioId", "propiedadId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitacion_token_key" ON "Invitacion"("token");

-- CreateIndex
CREATE INDEX "Invitacion_propiedadId_idx" ON "Invitacion"("propiedadId");

-- CreateIndex
CREATE INDEX "Bitacora_cuando_idx" ON "Bitacora"("cuando");

-- CreateIndex
CREATE INDEX "Bitacora_entidad_entidadId_idx" ON "Bitacora"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "Persona_nombre_idx" ON "Persona"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Referencia_personaId_orden_key" ON "Referencia"("personaId", "orden");

-- CreateIndex
CREATE INDEX "PropiedadPersona_propiedadId_idx" ON "PropiedadPersona"("propiedadId");

-- CreateIndex
CREATE UNIQUE INDEX "PropiedadPersona_propiedadId_personaId_rol_key" ON "PropiedadPersona"("propiedadId", "personaId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "Propiedad_slugPublico_key" ON "Propiedad"("slugPublico");

-- CreateIndex
CREATE INDEX "Propiedad_etapa_idx" ON "Propiedad"("etapa");

-- CreateIndex
CREATE INDEX "Propiedad_publicada_idx" ON "Propiedad"("publicada");

-- CreateIndex
CREATE INDEX "Foto_propiedadId_orden_idx" ON "Foto"("propiedadId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "TramiteCatalogo_numero_key" ON "TramiteCatalogo"("numero");

-- CreateIndex
CREATE INDEX "TramiteCatalogo_bloque_idx" ON "TramiteCatalogo"("bloque");

-- CreateIndex
CREATE INDEX "Tramite_propiedadId_estado_idx" ON "Tramite"("propiedadId", "estado");

-- CreateIndex
CREATE INDEX "Tramite_fechaLimite_idx" ON "Tramite"("fechaLimite");

-- CreateIndex
CREATE UNIQUE INDEX "Tramite_propiedadId_catalogoId_key" ON "Tramite"("propiedadId", "catalogoId");

-- CreateIndex
CREATE INDEX "Documento_propiedadId_idx" ON "Documento"("propiedadId");

-- CreateIndex
CREATE INDEX "Documento_tramiteId_idx" ON "Documento"("tramiteId");

-- CreateIndex
CREATE INDEX "Documento_estado_idx" ON "Documento"("estado");

-- CreateIndex
CREATE INDEX "Documento_vigenciaHasta_idx" ON "Documento"("vigenciaHasta");

-- CreateIndex
CREATE INDEX "Gasto_propiedadId_fecha_idx" ON "Gasto"("propiedadId", "fecha");

-- CreateIndex
CREATE INDEX "Gasto_categoria_idx" ON "Gasto"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "PartidaPresupuesto_propiedadId_categoria_key" ON "PartidaPresupuesto"("propiedadId", "categoria");

-- AddForeignKey
ALTER TABLE "AccesoAyudante" ADD CONSTRAINT "AccesoAyudante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccesoAyudante" ADD CONSTRAINT "AccesoAyudante_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referencia" ADD CONSTRAINT "Referencia_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropiedadPersona" ADD CONSTRAINT "PropiedadPersona_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropiedadPersona" ADD CONSTRAINT "PropiedadPersona_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Foto" ADD CONSTRAINT "Foto_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "TramiteCatalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_subidoPorUsuarioId_fkey" FOREIGN KEY ("subidoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_subidoPorInvitacionId_fkey" FOREIGN KEY ("subidoPorInvitacionId") REFERENCES "Invitacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "Tramite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_pagadoPorId_fkey" FOREIGN KEY ("pagadoPorId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPresupuesto" ADD CONSTRAINT "PartidaPresupuesto_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
