import { db } from "./db";
import { tramitesDelInvitado } from "./invitaciones";

/** Cuántos trámites del expediente van, sin contar los marcados "no aplica". */
export type Progreso = {
  total: number;
  completos: number;
  revisar: number;
  faltan: number;
  porcentaje: number;
};

/** Resumen de dinero de una propiedad: presupuestado vs. gastado. */
export type ResumenDinero = {
  gastado: number;
  presupuestado: number;
  desviacion: number;
  /** Margen estimado = valor de venta − compra − gastado. Null si falta el dato. */
  margen: number | null;
};

function armarProgreso(porEstado: Map<string, number>): Progreso {
  const completos = porEstado.get("completo") ?? 0;
  const revisar = porEstado.get("revisar") ?? 0;
  const faltan = porEstado.get("falta") ?? 0;
  const total = completos + revisar + faltan; // "no_aplica" queda fuera a propósito

  return {
    total,
    completos,
    revisar,
    faltan,
    porcentaje: total === 0 ? 0 : Math.round((completos / total) * 100),
  };
}

/**
 * Listado de propiedades con su avance y su dinero.
 *
 * Los conteos y las sumas los hace la base, no JavaScript. Antes se traían
 * todos los trámites y todos los gastos de CADA propiedad solo para contarlos:
 * con 50 propiedades son ~1,700 filas cargadas a memoria para sacar un
 * porcentaje.
 */
export async function listarPropiedades() {
  const [propiedades, tramites, gastos, presupuestos] = await Promise.all([
    db.propiedad.findMany({ orderBy: [{ etapa: "asc" }, { nombre: "asc" }] }),
    db.tramite.groupBy({ by: ["propiedadId", "estado"], _count: { _all: true } }),
    db.gasto.groupBy({ by: ["propiedadId"], _sum: { monto: true } }),
    db.partidaPresupuesto.groupBy({ by: ["propiedadId"], _sum: { monto: true } }),
  ]);

  const conteos = new Map<string, Map<string, number>>();
  for (const t of tramites) {
    const m = conteos.get(t.propiedadId) ?? new Map<string, number>();
    m.set(t.estado, t._count._all);
    conteos.set(t.propiedadId, m);
  }

  const gastado = new Map(gastos.map((g) => [g.propiedadId, g._sum.monto ?? 0]));
  const presupuestado = new Map(
    presupuestos.map((p) => [p.propiedadId, p._sum.monto ?? 0])
  );

  return propiedades.map((p) => {
    const gasto = gastado.get(p.id) ?? 0;
    const presupuesto = presupuestado.get(p.id) ?? 0;

    return {
      ...p,
      progreso: armarProgreso(conteos.get(p.id) ?? new Map()),
      dinero: {
        gastado: gasto,
        presupuestado: presupuesto,
        desviacion: gasto - presupuesto,
        margen:
          p.valorVentaEstimado != null && p.valorCompra != null
            ? p.valorVentaEstimado - p.valorCompra - gasto
            : null,
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
        include: {
          catalogo: true,
          // Los archivos que subió el comprador, para poder abrirlos desde el
          // expediente sin tener que ir a la bandeja de revisión.
          documentos: { orderBy: { creadoEn: "desc" } },
        },
        orderBy: { catalogo: { numero: "asc" } },
      },
      gastos: {
        include: { pagadoPor: true },
        orderBy: { fecha: "desc" },
      },
      presupuesto: true,
      personas: { include: { persona: { include: { referencias: true } } } },
      fotos: { orderBy: [{ esPortada: "desc" }, { orden: "asc" }] },
      invitaciones: {
        where: { revocada: false },
        include: { persona: true },
        orderBy: { creadaEn: "desc" },
      },
    },
  });
  if (!propiedad) return null;

  const gastado = propiedad.gastos.reduce((s, g) => s + g.monto, 0);
  const presupuestado = propiedad.presupuesto.reduce((s, b) => s + b.monto, 0);

  const porEstado = new Map<string, number>();
  for (const t of propiedad.tramites) {
    porEstado.set(t.estado, (porEstado.get(t.estado) ?? 0) + 1);
  }

  return {
    ...propiedad,
    progreso: armarProgreso(porEstado),
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
 *
 * El filtro pesado lo hace la base: solo se traen los que ya cumplen alguna
 * condición de alerta, en vez de los ~1,700 trámites para descartar casi todos.
 */
export async function tramitesAtorados() {
  const hoy = new Date();

  const tramites = await db.tramite.findMany({
    where: {
      propiedad: { etapa: { notIn: ["concluida", "cancelada"] } },
      OR: [
        { estado: "revisar" },
        { fechaLimite: { lt: hoy }, estado: { in: ["falta", "revisar"] } },
        // Orden de cobro pagada sin comprobante: dinero que ya salió.
        { ordenDeCobro: true, pagoComprobado: false, estado: { not: "completo" } },
      ],
    },
    include: {
      catalogo: true,
      propiedad: { select: { id: true, nombre: true, etapa: true } },
    },
  });

  return tramites
    .map((t) => {
      const vencido = t.fechaLimite != null && t.fechaLimite < hoy;
      const pagoIncompleto = t.ordenDeCobro && !t.pagoComprobado;

      let prioridad = 0;
      if (vencido) prioridad += 100;
      if (pagoIncompleto) prioridad += 50;
      if (t.estado === "revisar") prioridad += 20;
      if (t.responsable) prioridad += 5;

      return { ...t, vencido, pagoIncompleto, prioridad };
    })
    .sort((a, b) => b.prioridad - a.prioridad);
}

/** Cuánto ha puesto cada persona, en total y por propiedad. La cuenta entre socios. */
export async function cuentaEntreSocios() {
  const [sumas, personas, propiedades] = await Promise.all([
    db.gasto.groupBy({
      by: ["pagadoPorId", "propiedadId"],
      where: { pagadoPorId: { not: null } },
      _sum: { monto: true },
    }),
    db.persona.findMany({ select: { id: true, nombre: true } }),
    db.propiedad.findMany({ select: { id: true, nombre: true } }),
  ]);

  const nombrePersona = new Map(personas.map((p) => [p.id, p.nombre]));
  const nombrePropiedad = new Map(propiedades.map((p) => [p.id, p.nombre]));

  const porPersona = new Map<
    string,
    { nombre: string; total: number; porPropiedad: { nombre: string; monto: number }[] }
  >();

  for (const s of sumas) {
    if (!s.pagadoPorId) continue;
    const monto = s._sum.monto ?? 0;

    const entrada = porPersona.get(s.pagadoPorId) ?? {
      nombre: nombrePersona.get(s.pagadoPorId) ?? "Desconocido",
      total: 0,
      porPropiedad: [],
    };
    entrada.total += monto;
    entrada.porPropiedad.push({
      nombre: nombrePropiedad.get(s.propiedadId) ?? "—",
      monto,
    });
    porPersona.set(s.pagadoPorId, entrada);
  }

  return [...porPersona.values()]
    .map((p) => ({
      ...p,
      porPropiedad: p.porPropiedad.sort((a, b) => b.monto - a.monto),
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Totales de gastos de TODO el negocio, por categoría.
 *
 * Antes la pantalla de gastos sumaba los 200 movimientos que mostraba y
 * presentaba el resultado como si fuera el total. Con más de 200 movimientos
 * —cosa de un año— reportaba de menos sin avisar.
 */
export async function totalesDeGastos() {
  const [porCategoria, total] = await Promise.all([
    db.gasto.groupBy({ by: ["categoria"], _sum: { monto: true } }),
    db.gasto.aggregate({ _sum: { monto: true }, _count: { _all: true } }),
  ]);

  return {
    ranking: porCategoria
      .map((c) => ({ categoria: c.categoria, monto: c._sum.monto ?? 0 }))
      .sort((a, b) => b.monto - a.monto),
    total: total._sum.monto ?? 0,
    cuantos: total._count._all,
  };
}

export type MesDeEgresos = {
  /** "2026-09" */
  clave: string;
  /** Primer día del mes, a medianoche UTC. */
  inicio: Date;
  total: number;
};

/**
 * Egresos de todo el negocio, mes por mes, de los últimos `meses` (incluido
 * el actual). Los meses sin gastos salen en cero en vez de desaparecer: un
 * hueco en la gráfica es información.
 *
 * Todo en UTC: las fechas de gasto se capturan como día (sin hora) y se
 * guardan a medianoche UTC; agrupar en hora local movería los del día 1 al
 * mes anterior.
 */
export async function egresosPorMes(meses = 12, ahora = new Date()): Promise<MesDeEgresos[]> {
  const inicios: Date[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    inicios.push(new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - i, 1)));
  }
  const clave = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const gastos = await db.gasto.findMany({
    where: { fecha: { gte: inicios[0] } },
    select: { fecha: true, monto: true },
  });

  const suma = new Map<string, number>();
  for (const g of gastos) {
    suma.set(clave(g.fecha), (suma.get(clave(g.fecha)) ?? 0) + g.monto);
  }

  return inicios.map((inicio) => ({
    clave: clave(inicio),
    inicio,
    total: suma.get(clave(inicio)) ?? 0,
  }));
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

// ---------------------------------------------------------------------------
// Recordatorios
// ---------------------------------------------------------------------------

/** A los 3 días sin moverse, toca insistir. */
export const DIAS_PARA_INSISTIR = 3;

export type FilaRecordatorio = ReturnType<typeof armarRecordatorio>;

type InvitacionConTodo = Awaited<ReturnType<typeof invitacionesActivas>>[number];

async function invitacionesActivas() {
  return db.invitacion.findMany({
    where: { revocada: false },
    include: {
      persona: true,
      propiedad: {
        include: { tramites: { include: { catalogo: true, documentos: true } } },
      },
    },
    orderBy: { creadaEn: "desc" },
  });
}

/**
 * Calcula el estado de una invitación: cuánto lleva entregado, qué tiene que
 * corregir y qué tan urgente es picarle.
 *
 * Vive aquí y no dentro del componente porque es lógica de negocio: así se
 * puede probar sin montar una pantalla.
 */
function armarRecordatorio(i: InvitacionConTodo, ahora: Date) {
  const suyos = tramitesDelInvitado(i.propiedad.tramites, i.bloquesPermitidos);

  const entregados = suyos.filter((t) =>
    t.documentos.some((d) => d.estado !== "rechazado")
  ).length;

  const rechazados = suyos.filter(
    (t) =>
      t.documentos.length > 0 &&
      t.documentos.every((d) => d.estado === "rechazado")
  ).length;

  const faltan = suyos.length - entregados;
  const porcentaje =
    suyos.length === 0 ? 0 : Math.round((entregados / suyos.length) * 100);

  const ultimaSubida =
    i.propiedad.tramites
      .flatMap((t) => t.documentos)
      .filter((d) => d.subidoPorInvitacionId === i.id)
      .map((d) => d.creadoEn)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const referencia = ultimaSubida ?? i.ultimoAcceso ?? i.creadaEn;
  const diasSinMoverse = Math.floor(
    (ahora.getTime() - referencia.getTime()) / 86_400_000
  );

  const nuncaAbrio = i.vecesUsada === 0;
  const vencido = i.expiraEn != null && i.expiraEn < ahora;

  let urgencia = 0;
  if (faltan > 0 && nuncaAbrio) urgencia += 100; // ni siquiera entró
  if (rechazados > 0) urgencia += 60; // tiene que corregir algo
  if (faltan > 0 && diasSinMoverse >= DIAS_PARA_INSISTIR) urgencia += 40;
  if (vencido) urgencia += 30;

  return {
    invitacion: i,
    total: suyos.length,
    entregados,
    faltan,
    rechazados,
    porcentaje,
    diasSinMoverse,
    nuncaAbrio,
    vencido,
    urgencia,
  };
}

export async function recordatorios(ahora = new Date()) {
  const invitaciones = await invitacionesActivas();
  return invitaciones
    .map((i) => armarRecordatorio(i, ahora))
    .sort((a, b) => b.urgencia - a.urgencia);
}

export { armarRecordatorio };
