import { db } from "./db";

/** Cuántos trámites del expediente van, sin contar los marcados "no aplica". */
export type Progreso = {
  total: number;
  completos: number;
  revisar: number;
  faltan: number;
  porcentaje: number;
};

function calcularProgreso(
  tramites: { estado: string }[]
): Progreso {
  const aplicables = tramites.filter((t) => t.estado !== "no_aplica");
  const completos = aplicables.filter((t) => t.estado === "completo").length;
  const revisar = aplicables.filter((t) => t.estado === "revisar").length;
  const total = aplicables.length;
  return {
    total,
    completos,
    revisar,
    faltan: total - completos - revisar,
    porcentaje: total === 0 ? 0 : Math.round((completos / total) * 100),
  };
}

/** Resumen de dinero de una propiedad: presupuestado vs. gastado. */
export type ResumenDinero = {
  gastado: number;
  presupuestado: number;
  desviacion: number;
  /** Margen estimado = valor de venta − compra − gastado. Null si falta el dato. */
  margen: number | null;
};

export async function listarPropiedades() {
  const propiedades = await db.propiedad.findMany({
    orderBy: [{ etapa: "asc" }, { nombre: "asc" }],
    include: {
      tramites: { select: { estado: true } },
      gastos: { select: { monto: true } },
      presupuesto: { select: { monto: true } },
    },
  });

  return propiedades.map((p) => {
    const gastado = p.gastos.reduce((s, g) => s + g.monto, 0);
    const presupuestado = p.presupuesto.reduce((s, b) => s + b.monto, 0);
    const margen =
      p.valorVentaEstimado != null && p.valorCompra != null
        ? p.valorVentaEstimado - p.valorCompra - gastado
        : null;

    return {
      ...p,
      progreso: calcularProgreso(p.tramites),
      dinero: {
        gastado,
        presupuestado,
        desviacion: gastado - presupuestado,
        margen,
      } satisfies ResumenDinero,
    };
  });
}

export type PropiedadListada = Awaited<ReturnType<typeof listarPropiedades>>[number];

export async function obtenerPropiedad(id: string) {
  const propiedad = await db.propiedad.findUnique({
    where: { id },
    include: {
      tramites: {
        include: { catalogo: true },
        orderBy: { catalogo: { numero: "asc" } },
      },
      gastos: {
        include: { pagadoPor: true },
        orderBy: { fecha: "desc" },
      },
      presupuesto: true,
      personas: { include: { persona: true } },
    },
  });
  if (!propiedad) return null;

  const gastado = propiedad.gastos.reduce((s, g) => s + g.monto, 0);
  const presupuestado = propiedad.presupuesto.reduce((s, b) => s + b.monto, 0);

  return {
    ...propiedad,
    progreso: calcularProgreso(propiedad.tramites),
    dinero: {
      gastado,
      presupuestado,
      desviacion: gastado - presupuestado,
      margen:
        propiedad.valorVentaEstimado != null && propiedad.valorCompra != null
          ? propiedad.valorVentaEstimado - propiedad.valorCompra - gastado
          : null,
    } satisfies ResumenDinero,
  };
}

export type PropiedadDetalle = NonNullable<Awaited<ReturnType<typeof obtenerPropiedad>>>;

/**
 * Los trámites que traen bandera roja, ordenados por urgencia.
 * Esto es el semáforo del tablero: lo que hay que empujar hoy.
 */
export async function tramitesAtorados() {
  const hoy = new Date();

  const tramites = await db.tramite.findMany({
    where: {
      estado: { in: ["falta", "revisar"] },
      propiedad: { etapa: { notIn: ["concluida", "cancelada"] } },
    },
    include: { catalogo: true, propiedad: { select: { id: true, nombre: true, etapa: true } } },
  });

  return tramites
    .map((t) => {
      const vencido = t.fechaLimite != null && t.fechaLimite < hoy;
      // Pagaste la orden de cobro pero nunca subiste el comprobante: es dinero
      // que ya salió y trámite que sigue sin cerrar. Eso pesa más que un "falta".
      const pagoIncompleto = t.ordenDeCobro && !t.pagoComprobado;

      let prioridad = 0;
      if (vencido) prioridad += 100;
      if (pagoIncompleto) prioridad += 50;
      if (t.estado === "revisar") prioridad += 20;
      if (t.responsable) prioridad += 5;

      return { ...t, vencido, pagoIncompleto, prioridad };
    })
    .filter((t) => t.prioridad > 0)
    .sort((a, b) => b.prioridad - a.prioridad);
}

/** Cuánto ha puesto cada persona, en total y por propiedad. La cuenta entre socios. */
export async function cuentaEntreSocios() {
  const gastos = await db.gasto.findMany({
    where: { pagadoPorId: { not: null } },
    include: { pagadoPor: true, propiedad: { select: { id: true, nombre: true } } },
  });

  const porPersona = new Map<
    string,
    { nombre: string; total: number; porPropiedad: Map<string, { nombre: string; monto: number }> }
  >();

  for (const g of gastos) {
    if (!g.pagadoPor) continue;
    const entry = porPersona.get(g.pagadoPor.id) ?? {
      nombre: g.pagadoPor.nombre,
      total: 0,
      porPropiedad: new Map(),
    };
    entry.total += g.monto;
    const prop = entry.porPropiedad.get(g.propiedad.id) ?? {
      nombre: g.propiedad.nombre,
      monto: 0,
    };
    prop.monto += g.monto;
    entry.porPropiedad.set(g.propiedad.id, prop);
    porPersona.set(g.pagadoPor.id, entry);
  }

  return [...porPersona.values()]
    .map((p) => ({
      nombre: p.nombre,
      total: p.total,
      porPropiedad: [...p.porPropiedad.values()].sort((a, b) => b.monto - a.monto),
    }))
    .sort((a, b) => b.total - a.total);
}

/** Números de arriba del tablero. */
export async function resumenGeneral() {
  const propiedades = await listarPropiedades();
  const activas = propiedades.filter(
    (p) => p.etapa !== "concluida" && p.etapa !== "cancelada"
  );

  const invertido = activas.reduce(
    (s, p) => s + (p.valorCompra ?? 0) + p.dinero.gastado,
    0
  );
  const valorEsperado = activas.reduce((s, p) => s + (p.valorVentaEstimado ?? 0), 0);

  const atorados = await tramitesAtorados();

  return {
    totalPropiedades: propiedades.length,
    activas: activas.length,
    invertido,
    valorEsperado,
    margenEsperado: valorEsperado > 0 ? valorEsperado - invertido : null,
    tramitesPendientes: atorados.length,
    tramitesVencidos: atorados.filter((t) => t.vencido).length,
    pagosSinComprobante: atorados.filter((t) => t.pagoIncompleto).length,
  };
}
