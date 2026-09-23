import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { egresosPorMes } from "./queries";

// La gráfica de egresos de /gastos. Se prueba en el año 2099 para no
// mezclarse con gastos reales de la base local.

const PROPIEDAD = "propiedad-prueba-egresos";
const AHORA = new Date(Date.UTC(2099, 4, 20)); // 20 de mayo de 2099

beforeAll(async () => {
  await db.propiedad.upsert({
    where: { id: PROPIEDAD },
    update: {},
    create: { id: PROPIEDAD, nombre: "Casa de prueba (egresos)", etapa: "remodelacion" },
  });
  await db.gasto.deleteMany({ where: { propiedadId: PROPIEDAD } });

  const gasto = (fecha: Date, monto: number) => ({
    propiedadId: PROPIEDAD,
    fecha,
    monto,
    descripcion: "prueba",
    categoria: "material",
    metodo: "efectivo",
  });

  await db.gasto.createMany({
    data: [
      // Día 1 a medianoche UTC: así se guarda una fecha capturada sin hora.
      // En hora de Chihuahua sería el 28 de febrero; debe contar en MARZO.
      gasto(new Date(Date.UTC(2099, 2, 1)), 1000),
      gasto(new Date(Date.UTC(2099, 2, 31)), 500),
      gasto(new Date(Date.UTC(2099, 4, 15)), 250),
      // Fuera de la ventana: no debe sumar en ningún lado.
      gasto(new Date(Date.UTC(2098, 0, 10)), 99999),
    ],
  });
});

afterAll(async () => {
  await db.propiedad.delete({ where: { id: PROPIEDAD } }).catch(() => {});
  await db.$disconnect();
});

describe("egresos por mes", () => {
  it("agrupa por mes calendario, en UTC", async () => {
    const meses = await egresosPorMes(4, AHORA);
    expect(meses.map((m) => m.clave)).toEqual(["2099-02", "2099-03", "2099-04", "2099-05"]);
    expect(meses.find((m) => m.clave === "2099-03")?.total).toBe(1500);
    expect(meses.find((m) => m.clave === "2099-05")?.total).toBe(250);
  });

  it("los meses sin gastos salen en cero, no desaparecen", async () => {
    const meses = await egresosPorMes(4, AHORA);
    expect(meses).toHaveLength(4);
    expect(meses.find((m) => m.clave === "2099-02")?.total).toBe(0);
    expect(meses.find((m) => m.clave === "2099-04")?.total).toBe(0);
  });

  it("lo anterior a la ventana no se cuela", async () => {
    const meses = await egresosPorMes(4, AHORA);
    const suma = meses.reduce((s, m) => s + m.total, 0);
    expect(suma).toBe(1750);
  });
});
