import type { PrismaClient } from "@prisma/client";
import { db as dbCompartida } from "./db";

// Documentos del cónyuge. Regla de Erick (24/09/2026): si el vendedor o el
// comprador es CASADO —sea cual sea el régimen— se piden los documentos de su
// cónyuge. Si es soltero (o no se ha capturado), no aparecen.
//
// Se abren y se cierran solos según el estado civil capturado en Personas:
// "no_aplica" = cerrado. El expediente los esconde y el link del invitado no
// se los pide.

export const DOCS_CONYUGE = {
  // 6 = acta de matrimonio del vendedor (ya existía); 34-37 = su cónyuge.
  vendedor: [6, 34, 35, 36, 37],
  // 38 = acta de matrimonio del comprador; 39-42 = su cónyuge.
  comprador: [38, 39, 40, 41, 42],
} as const;

export type Lado = keyof typeof DOCS_CONYUGE;

const TODOS = new Set<number>([...DOCS_CONYUGE.vendedor, ...DOCS_CONYUGE.comprador]);

export function esDeConyuge(numero: number): boolean {
  return TODOS.has(numero);
}

export function ladoDe(numero: number): Lado | null {
  if ((DOCS_CONYUGE.vendedor as readonly number[]).includes(numero)) return "vendedor";
  if ((DOCS_CONYUGE.comprador as readonly number[]).includes(numero)) return "comprador";
  return null;
}

/**
 * A qué estado pasa un documento del cónyuge, o null si se queda como está.
 *   · Casado y cerrado → se abre ("falta").
 *   · No casado y abierto sin nada → se cierra ("no_aplica").
 *   · Lo que ya tiene archivo, está en revisión o completo NO se toca: si
 *     alguien corrige el estado civil por error, no se pierde trabajo.
 */
export function nuevoEstadoConyuge(opciones: {
  casado: boolean;
  estado: string;
  tieneDocumentos: boolean;
}): "falta" | "no_aplica" | null {
  const { casado, estado, tieneDocumentos } = opciones;
  if (casado && estado === "no_aplica") return "falta";
  if (!casado && estado === "falta" && !tieneDocumentos) return "no_aplica";
  return null;
}

/**
 * Abre o cierra los documentos del cónyuge de una propiedad según quién es
 * casado. Se llama al guardar, vincular o desvincular una persona, y al crear
 * la propiedad. `cliente` existe para el seed, que usa su propia conexión.
 */
export async function sincronizarConyuge(
  propiedadId: string,
  cliente: PrismaClient = dbCompartida
): Promise<void> {
  const [personas, tramites] = await Promise.all([
    cliente.propiedadPersona.findMany({
      where: { propiedadId, rol: { in: ["vendedor", "comprador"] } },
      select: { rol: true, persona: { select: { estadoCivil: true } } },
    }),
    cliente.tramite.findMany({
      where: { propiedadId, catalogo: { numero: { in: [...TODOS] } } },
      select: {
        id: true,
        estado: true,
        catalogo: { select: { numero: true } },
        documentos: { where: { estado: { not: "rechazado" } }, select: { id: true } },
      },
    }),
  ]);

  const casado = (lado: Lado) =>
    personas.some((pp) => pp.rol === lado && pp.persona.estadoCivil === "casado");

  for (const t of tramites) {
    const lado = ladoDe(t.catalogo.numero);
    if (!lado) continue;
    const nuevo = nuevoEstadoConyuge({
      casado: casado(lado),
      estado: t.estado,
      tieneDocumentos: t.documentos.length > 0,
    });
    if (nuevo) {
      await cliente.tramite.update({
        where: { id: t.id },
        data: { estado: nuevo, docRecibido: false },
      });
    }
  }
}
