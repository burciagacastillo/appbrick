import { describe, it, expect } from "vitest";
import {
  claveDia,
  diaValido,
  sumarDias,
  diaDeLaSemana,
  instanteDelDia,
  etiquetaDia,
  etiquetaPaso,
  armarSemana,
  armarMes,
  rangoDelMes,
  mesValido,
  mesVecino,
  type Evento,
} from "./agenda";

// La agenda cuenta días de Chihuahua aunque el servidor esté en UTC. Si se
// equivocara, un paso de "mañana" saldría hoy después de las 6 de la tarde.

function evento(over: Partial<Evento>): Evento {
  return {
    clave: Math.random().toString(36),
    tipo: "paso",
    dia: "2026-11-08",
    hora: null,
    titulo: "Llevar plano a catastro",
    propiedadId: "praderas",
    propiedadNombre: "Praderas",
    pasoId: "p1",
    hecho: false,
    ...over,
  };
}

describe("días de Chihuahua, no del servidor", () => {
  it("a las 8 de la noche de Chihuahua sigue siendo el mismo día (en UTC ya es mañana)", () => {
    // 2026-11-09 02:00 UTC = 2026-11-08 20:00 en Chihuahua (UTC-6).
    expect(claveDia(new Date("2026-11-09T02:00:00Z"))).toBe("2026-11-08");
  });

  it("lo que se guarda para un día cae en ese mismo día", () => {
    expect(claveDia(instanteDelDia("2026-11-08"))).toBe("2026-11-08");
    expect(claveDia(instanteDelDia("2026-12-31"))).toBe("2026-12-31");
  });

  it("suma días cruzando meses y años", () => {
    expect(sumarDias("2026-11-28", 6)).toBe("2026-12-04");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("rechaza días que no existen (JavaScript los recorre en silencio)", () => {
    expect(diaValido("2026-11-08")).toBe(true);
    expect(diaValido("2026-02-31")).toBe(false);
    expect(diaValido("2026-02-29")).toBe(false);
    expect(diaValido("2028-02-29")).toBe(true); // bisiesto
    expect(diaValido("08/11/2026")).toBe(false);
  });

  it("la semana empieza en lunes", () => {
    expect(diaDeLaSemana("2026-11-09")).toBe(0); // lunes
    expect(diaDeLaSemana("2026-11-08")).toBe(6); // domingo
  });
});

describe("etiquetas", () => {
  it("hoy, mañana, ayer y la fecha corta", () => {
    expect(etiquetaDia("2026-11-08", "2026-11-08")).toBe("Hoy");
    expect(etiquetaDia("2026-11-09", "2026-11-08")).toBe("Mañana");
    expect(etiquetaDia("2026-11-07", "2026-11-08")).toBe("Ayer");
    expect(etiquetaDia("2026-11-12", "2026-11-08")).toMatch(/12/);
  });

  it("un paso atrasado se marca como vencido", () => {
    expect(etiquetaPaso("2026-11-07", "2026-11-08")).toEqual({ texto: "Venció ayer", atrasado: true });
    expect(etiquetaPaso("2026-11-08", "2026-11-08")).toEqual({ texto: "Hoy", atrasado: false });
    expect(etiquetaPaso(null, "2026-11-08")).toBeNull();
  });
});

describe("armarSemana — Esta semana", () => {
  const HOY = "2026-11-08";

  it("hoy y los seis días siguientes, cada uno con lo suyo", () => {
    const s = armarSemana(
      [evento({ dia: "2026-11-08" }), evento({ dia: "2026-11-10", tipo: "firma", titulo: "Firma" })],
      HOY
    );
    expect(s.dias).toHaveLength(7);
    expect(s.dias[0].dia).toBe(HOY);
    expect(s.dias[6].dia).toBe("2026-11-14");
    expect(s.dias[0].eventos).toHaveLength(1);
    expect(s.dias[2].eventos[0].tipo).toBe("firma");
  });

  it("atrasados: pasos sin hacer y documentos vencidos; no una firma que ya pasó", () => {
    const s = armarSemana(
      [
        evento({ dia: "2026-11-05", titulo: "Paso atrasado" }),
        evento({ dia: "2026-11-05", titulo: "Paso hecho", hecho: true }),
        evento({ dia: "2026-11-01", tipo: "vence", titulo: "Venció recibo de luz" }),
        evento({ dia: "2026-11-02", tipo: "firma", titulo: "Firma pasada" }),
      ],
      HOY
    );
    expect(s.atrasados.map((e) => e.titulo)).toEqual(["Venció recibo de luz", "Paso atrasado"]);
  });

  it("los pasos hechos no salen, y los que no tienen fecha van aparte", () => {
    const s = armarSemana(
      [evento({ hecho: true }), evento({ dia: null, titulo: "Cuando se pueda" })],
      HOY
    );
    expect(s.dias[0].eventos).toHaveLength(0);
    expect(s.sinFecha.map((e) => e.titulo)).toEqual(["Cuando se pueda"]);
  });

  it("dentro de un día, lo que tiene hora va primero y en orden", () => {
    const s = armarSemana(
      [
        evento({ titulo: "Sin hora" }),
        evento({ titulo: "Notaría", hora: "12:00" }),
        evento({ titulo: "Catastro", hora: "09:30" }),
      ],
      HOY
    );
    expect(s.dias[0].eventos.map((e) => e.titulo)).toEqual(["Catastro", "Notaría", "Sin hora"]);
  });
});

describe("armarMes — el calendario", () => {
  it("semanas completas de lunes a domingo, marcando hoy y los días de otro mes", () => {
    const semanas = armarMes([evento({ dia: "2026-11-20" })], "2026-11", "2026-11-08");
    // Noviembre 2026: empieza en domingo y termina en lunes → del 26 oct al 6 dic.
    expect(rangoDelMes("2026-11")).toEqual({ desde: "2026-10-26", hasta: "2026-12-06" });
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas[0][0]).toMatchObject({ dia: "2026-10-26", delMes: false });
    const plano = semanas.flat();
    expect(plano.find((d) => d.esHoy)?.dia).toBe("2026-11-08");
    expect(plano.find((d) => d.dia === "2026-11-20")?.eventos).toHaveLength(1);
  });

  it("el mes de la URL se valida y se navega", () => {
    expect(mesValido("2026-11")).toBe(true);
    expect(mesValido("2026-13")).toBe(false);
    expect(mesValido("<script>")).toBe(false);
    expect(mesVecino("2026-12", 1)).toBe("2027-01");
    expect(mesVecino("2026-01", -1)).toBe("2025-12");
  });
});
