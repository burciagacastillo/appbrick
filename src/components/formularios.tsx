"use client";

import { useActionState, useRef, useEffect } from "react";
import {
  agregarGasto,
  crearPropiedad,
  type ResultadoGasto,
  type ResultadoNuevaPropiedad,
} from "@/acciones/propiedades";
import { rechazarDocumento, type ResultadoRechazo } from "@/acciones/documentos";
import { invitarPersona, type ResultadoInvitar } from "@/acciones/equipo";
import { BOTON_PRIMARIO, CLASE_CAMPO, Campo, ErrorCampo } from "./ui";
import {
  CATEGORIAS_GASTO,
  GRUPOS_GASTO,
  METODOS_PAGO,
  ETAPAS,
  TIPOS_PROPIEDAD,
} from "@/lib/constants";

// Formularios que pueden fallar por datos, no por un fallo del programa.
//
// Viven aquí como componentes de cliente porque sus acciones ahora devuelven
// un mensaje en vez de lanzar. Antes un motivo de rechazo vacío o dos personas
// con el mismo nombre tiraban al usuario a la pantalla de error de Next; ahora
// le explican qué pasó sin sacarlo de donde está.

// ---------------------------------------------------------------------------

/**
 * Captura de un gasto. Dentro de una propiedad recibe `propiedadId`; en la
 * pantalla global de Gastos recibe `propiedades` y pinta un selector.
 */
export function FormaGasto({
  propiedadId,
  propiedades,
}: {
  propiedadId?: string;
  propiedades?: { id: string; nombre: string }[];
}) {
  const [estado, accion, pendiente] = useActionState<ResultadoGasto | null, FormData>(
    agregarGasto,
    null
  );
  const forma = useRef<HTMLFormElement>(null);

  // Al guardar bien se limpia, para poder capturar el siguiente de corrido.
  useEffect(() => {
    if (estado?.ok) forma.current?.reset();
  }, [estado]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form ref={forma} action={accion} className="grid gap-3 px-6 pt-1 pb-6 sm:grid-cols-6">
      {propiedadId ? (
        <input type="hidden" name="propiedadId" value={propiedadId} />
      ) : (
        <Campo etiqueta="Propiedad" className="sm:col-span-6">
          <select name="propiedadId" required className={CLASE_CAMPO}>
            {(propiedades ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <Campo etiqueta="Fecha" className="sm:col-span-1">
        <input type="date" name="fecha" defaultValue={hoy} className={CLASE_CAMPO} />
      </Campo>

      <Campo etiqueta="Descripción" className="sm:col-span-2">
        <input
          name="descripcion"
          required
          placeholder="Cemento, 20 bultos"
          className={CLASE_CAMPO}
        />
      </Campo>

      <Campo etiqueta="Categoría" className="sm:col-span-1">
        <select name="categoria" defaultValue="material" className={CLASE_CAMPO}>
          {GRUPOS_GASTO.map((g) => (
            <optgroup key={g} label={g}>
              {CATEGORIAS_GASTO.filter((c) => c.grupo === g).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Método" className="sm:col-span-1">
        <select name="metodo" defaultValue="transferencia" className={CLASE_CAMPO}>
          {METODOS_PAGO.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Monto" className="sm:col-span-1">
        <input
          type="number"
          step="0.01"
          min="0"
          name="monto"
          required
          className={`${CLASE_CAMPO} tabular`}
        />
      </Campo>

      <Campo etiqueta="Quién pagó" className="sm:col-span-2">
        <input name="pagadoPor" placeholder="Erick, Aragón, Enrique…" className={CLASE_CAMPO} />
      </Campo>

      <div className="flex items-end sm:col-span-4">
        <button type="submit" disabled={pendiente} className={BOTON_PRIMARIO}>
          {pendiente ? "Guardando…" : "Agregar gasto"}
        </button>
      </div>

      {estado?.ok === false ? (
        <div className="sm:col-span-6">
          <ErrorCampo>{estado.error}</ErrorCampo>
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------

export function FormaRechazo({
  documentoId,
  quien,
  motivosRapidos,
}: {
  documentoId: string;
  quien: string;
  motivosRapidos: string[];
}) {
  const [estado, accion, pendiente] = useActionState<ResultadoRechazo | null, FormData>(
    rechazarDocumento,
    null
  );

  return (
    <details>
      <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-rose-600 ring-1 ring-inset ring-rose-200 transition-colors hover:bg-rose-50">
        Rechazar
      </summary>
      <form action={accion} className="mt-3 rounded-2xl bg-fondo p-4">
        <input type="hidden" name="documentoId" value={documentoId} />
        <p className="text-xs text-tenue">
          Esto es lo que va a leer {quien} en su portal.
        </p>
        <input
          name="motivo"
          required
          list={`motivos-${documentoId}`}
          placeholder="¿Por qué hay que volver a subirlo?"
          className={CLASE_CAMPO}
        />
        <datalist id={`motivos-${documentoId}`}>
          {motivosRapidos.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={pendiente}
          className="mt-3 inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
        >
          {pendiente ? "Avisando…" : "Rechazar y avisarle"}
        </button>
        {estado?.ok === false ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
      </form>
    </details>
  );
}

// ---------------------------------------------------------------------------

export function FormaInvitar({
  propiedades,
}: {
  propiedades: { id: string; nombre: string }[];
}) {
  const [estado, accion, pendiente] = useActionState<ResultadoInvitar | null, FormData>(
    invitarPersona,
    null
  );
  const forma = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok) forma.current?.reset();
  }, [estado]);

  return (
    <form ref={forma} action={accion} className="grid gap-3 px-6 pt-1 pb-6 sm:grid-cols-5">
      <Campo etiqueta="Propiedad" className="sm:col-span-2">
        <select name="propiedadId" className={CLASE_CAMPO} required>
          {propiedades.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Es el…">
        <select name="rol" className={CLASE_CAMPO} defaultValue="comprador">
          <option value="comprador">Comprador</option>
          <option value="vendedor">Vendedor</option>
        </select>
      </Campo>

      <Campo etiqueta="Nombre">
        <input name="nombre" required placeholder="Edgar Vázquez" className={CLASE_CAMPO} />
      </Campo>

      <Campo etiqueta="WhatsApp" nota="Sin esto no se le puede mandar el link">
        <input name="telefono" placeholder="614 123 4567" className={CLASE_CAMPO} />
      </Campo>

      <div className="pt-1 sm:col-span-5">
        <button type="submit" disabled={pendiente} className={BOTON_PRIMARIO}>
          {pendiente ? "Generando…" : "Generar link"}
        </button>
        <span className="ml-3 text-xs text-tenue">
          Si ya tenía uno, el anterior deja de funcionar.
        </span>
        {estado?.ok === false ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

/**
 * Alta de propiedad: lo mínimo para arrancar. Valores de venta, presupuesto y
 * lo demás se capturan después en la pestaña Datos, cuando se sepan.
 */
export function FormaNuevaPropiedad() {
  const [estado, accion, pendiente] = useActionState<ResultadoNuevaPropiedad, FormData>(
    crearPropiedad,
    null
  );

  return (
    <form action={accion} className="grid gap-4 px-6 pt-1 pb-6 sm:grid-cols-2">
      <Campo etiqueta="Nombre" nota="Como la reconoces: “Praderas 12”, “Casa de Aldama”…" className="sm:col-span-2">
        <input name="nombre" required autoFocus maxLength={200} className={CLASE_CAMPO} />
      </Campo>

      <Campo etiqueta="Dirección">
        <input name="direccion" maxLength={200} className={CLASE_CAMPO} />
      </Campo>
      <Campo etiqueta="Colonia">
        <input name="colonia" maxLength={200} className={CLASE_CAMPO} />
      </Campo>
      <Campo etiqueta="Ciudad">
        <input name="ciudad" defaultValue="Chihuahua" maxLength={200} className={CLASE_CAMPO} />
      </Campo>

      <Campo etiqueta="Tipo">
        <select name="tipo" defaultValue="casa" className={CLASE_CAMPO}>
          {TIPOS_PROPIEDAD.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Fase">
        <select name="etapa" defaultValue="adquisicion" className={CLASE_CAMPO}>
          {ETAPAS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Valor de compra" nota="Opcional">
        <input type="number" step="0.01" min="0" name="valorCompra" className={`${CLASE_CAMPO} tabular`} />
      </Campo>

      <Campo etiqueta="Notas" nota="Opcional: vendedor, comprador, de dónde salió…" className="sm:col-span-2">
        <textarea name="notas" rows={3} maxLength={4000} className={CLASE_CAMPO} />
      </Campo>

      <div className="flex flex-wrap items-center gap-3 pt-1 sm:col-span-2">
        <button type="submit" disabled={pendiente} className={BOTON_PRIMARIO}>
          {pendiente ? "Creando…" : "Crear propiedad"}
        </button>
        <span className="text-xs text-tenue">Se crea con su expediente de 34 trámites vacío.</span>
      </div>

      {estado?.ok === false ? (
        <div className="sm:col-span-2">
          <ErrorCampo>{estado.error}</ErrorCampo>
        </div>
      ) : null}
    </form>
  );
}
