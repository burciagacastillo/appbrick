"use client";

import { useState } from "react";
import { MODALIDADES } from "@/lib/constants";
import { CLASE_CAMPO } from "./ui";

// Los campos de dinero de la pestaña Datos: cambian según la propiedad sea
// propia o externa (src/lib/modalidad.ts). Recibe solo los números que edita,
// nunca la propiedad completa: todo lo que llega aquí viaja al navegador.
//
// Los campos que no se ven van ocultos con su valor: si no, marcar una casa
// como externa por error y guardar borraría su valor de compra.

type Valores = {
  cobroCliente: number | null;
  valorCompra: number | null;
  valorVentaEstimado: number | null;
  valorVentaReal: number | null;
  presupuestoObra: number | null;
};

function Dinero({ nombre, etiqueta, valor }: { nombre: keyof Valores; etiqueta: string; valor: number | null }) {
  return (
    <label className="text-xs">
      <span className="font-medium text-tenue">{etiqueta}</span>
      <input
        type="number"
        step="0.01"
        min="0"
        name={nombre}
        defaultValue={valor ?? ""}
        className={`${CLASE_CAMPO} tabular`}
      />
    </label>
  );
}

function Oculto({ nombre, valor }: { nombre: keyof Valores; valor: number | null }) {
  return <input type="hidden" name={nombre} value={valor ?? ""} />;
}

export function CamposDinero({ modalidad, valores }: { modalidad: string; valores: Valores }) {
  const [actual, setActual] = useState(modalidad);
  const externa = actual === "externa";

  return (
    <>
      <label className="text-xs sm:col-span-2">
        <span className="font-medium text-tenue">¿De quién es?</span>
        <select
          name="modalidad"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          className={CLASE_CAMPO}
        >
          {MODALIDADES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.desc}
            </option>
          ))}
        </select>
      </label>

      {externa ? (
        <>
          <Dinero nombre="cobroCliente" etiqueta="Lo que cobro" valor={valores.cobroCliente} />
          <Dinero nombre="presupuestoObra" etiqueta="Presupuesto de adecuaciones" valor={valores.presupuestoObra} />
          <Oculto nombre="valorCompra" valor={valores.valorCompra} />
          <Oculto nombre="valorVentaEstimado" valor={valores.valorVentaEstimado} />
          <Oculto nombre="valorVentaReal" valor={valores.valorVentaReal} />
        </>
      ) : (
        <>
          <Dinero nombre="valorCompra" etiqueta="Valor de compra" valor={valores.valorCompra} />
          <Dinero nombre="valorVentaEstimado" etiqueta="Venta estimada" valor={valores.valorVentaEstimado} />
          <Dinero nombre="valorVentaReal" etiqueta="Venta real" valor={valores.valorVentaReal} />
          <Dinero nombre="presupuestoObra" etiqueta="Presupuesto de obra" valor={valores.presupuestoObra} />
          <Oculto nombre="cobroCliente" valor={valores.cobroCliente} />
        </>
      )}
    </>
  );
}
