"use client";

import { useActionState, useState } from "react";
import { guardarPaso, type ResultadoPaso } from "@/acciones/pasos";
import { BOTON_PRIMARIO, CLASE_CAMPO, ErrorCampo } from "./ui";

// Agregar o editar un paso. De cliente solo para limpiarse después de
// agregar y enseñar el error sin salir de la ficha. Recibe la lista de
// trámites (número y nombre), nada de personas ni dinero.

export type OpcionTramite = { id: string; numero: number; nombre: string };

export function FormaPaso({
  propiedadId,
  tramites,
  paso,
}: {
  propiedadId: string;
  tramites: OpcionTramite[];
  /** Si viene, edita ese paso. */
  paso?: { id: string; titulo: string; dia: string | null; hora: string | null; tramiteId: string | null };
}) {
  const [estado, accion, pendiente] = useActionState<ResultadoPaso | null, FormData>(guardarPaso, null);
  const [vuelta, setVuelta] = useState(0);
  const [ultimo, setUltimo] = useState(estado);

  // Al agregar bien, el formulario queda en blanco para el siguiente.
  if (estado !== ultimo) {
    setUltimo(estado);
    if (estado?.ok && !paso) setVuelta((n) => n + 1);
  }

  return (
    <form key={vuelta} action={accion} className="grid gap-2 sm:grid-cols-6">
      <input type="hidden" name="propiedadId" value={propiedadId} />
      {paso ? <input type="hidden" name="pasoId" value={paso.id} /> : null}

      <input
        name="titulo"
        required
        maxLength={200}
        defaultValue={paso?.titulo}
        placeholder="Qué sigue: llevar plano a catastro, cita en notaría…"
        aria-label="Qué hay que hacer"
        className={`${CLASE_CAMPO} sm:col-span-6`}
      />
      <input
        type="date"
        name="fecha"
        defaultValue={paso?.dia ?? ""}
        aria-label="Fecha (opcional)"
        className={`${CLASE_CAMPO} sm:col-span-2`}
      />
      <input
        type="time"
        name="hora"
        defaultValue={paso?.hora ?? ""}
        aria-label="Hora (opcional)"
        className={`${CLASE_CAMPO} sm:col-span-1`}
      />
      <select
        name="tramiteId"
        defaultValue={paso?.tramiteId ?? ""}
        aria-label="Trámite (opcional)"
        className={`${CLASE_CAMPO} sm:col-span-2`}
      >
        <option value="">Sin trámite</option>
        {tramites.map((t) => (
          <option key={t.id} value={t.id}>
            {t.numero} · {t.nombre}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pendiente} className={`${BOTON_PRIMARIO} justify-center sm:col-span-1`}>
        {pendiente ? "…" : paso ? "Guardar" : "Agregar"}
      </button>

      {estado?.ok === false ? (
        <div className="sm:col-span-6">
          <ErrorCampo>{estado.error}</ErrorCampo>
        </div>
      ) : null}
    </form>
  );
}
