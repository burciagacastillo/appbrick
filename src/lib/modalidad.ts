import { PAQUETES } from "./paquetes";
import { esDeConyuge } from "./conyuge";

// Propia o externa (pedido de Erick del 01/10/2026). Una externa es una casa
// que no es suya: alguien que ya tiene comprador y solo quiere la
// tramitología, una licenciada de notaría que le pide un avalúo, o un trámite
// con asesoría y adecuaciones (barandal, cementado). No hay valor de compra:
// lo que gana es lo que cobra menos lo que gastó.

type ConDinero = {
  modalidad: string;
  valorCompra: number | null;
  valorVentaEstimado: number | null;
  cobroCliente: number | null;
};

/**
 * Margen (propia) o utilidad (externa) esperados. null si falta el dato para
 * calcularlo: un cero inventado se leería como "no gané nada".
 */
export function margenDe(p: ConDinero, gastado: number): number | null {
  if (p.modalidad === "externa") {
    return p.cobroCliente != null ? p.cobroCliente - gastado : null;
  }
  return p.valorVentaEstimado != null && p.valorCompra != null
    ? p.valorVentaEstimado - p.valorCompra - gastado
    : null;
}

/** Los trámites que pide el paquete del avalúo (el orden del valuador vive en paquetes.ts). */
export const NUMEROS_AVALUO: ReadonlySet<number> = new Set(
  PAQUETES.find((p) => p.id === "avaluo")!.piezas.map((p) => p.numero)
);

export type Expediente = "completo" | "avaluo";

/**
 * Cómo nace cada trámite de una propiedad nueva. "Solo avalúo" abre nada más
 * lo que pide el valuador; lo demás nace en "no aplica" (se puede abrir a
 * mano si el trato crece). Los del cónyuge siempre nacen cerrados: se abren
 * solos al capturar a alguien casado.
 */
export function estadoInicial(numero: number, expediente: Expediente): "falta" | "no_aplica" {
  if (esDeConyuge(numero)) return "no_aplica";
  if (expediente === "avaluo") return NUMEROS_AVALUO.has(numero) ? "falta" : "no_aplica";
  return "falta";
}
