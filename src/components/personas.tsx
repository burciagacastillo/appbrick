"use client";

import { useActionState, useState } from "react";
import {
  guardarPersona,
  guardarReferencias,
  vincularPersona,
  desvincularPersona,
  borrarPassword,
  revelarPassword,
  guardarOperacion,
  type Resultado,
  type ResultadoRevelar,
} from "@/acciones/personas";
import { Card, CardHeader, Badge, Campo, CLASE_CAMPO, ErrorCampo, Exito, Vacio, BOTON_PRIMARIO } from "./ui";
import { ESTADOS_CIVILES, REGIMENES, ROLES_PERSONA, mxn } from "@/lib/constants";
import type { PropiedadDetalle } from "@/lib/queries";

// Pestaña "Personas": los datos que no son archivo.
//
// Es la pantalla con la información más sensible de la app — NSS, contraseña
// del portal Infonavit, referencias — y por eso el ayudante no la ve nunca,
// ni siquiera con acceso a la propiedad.

type Vinculo = PropiedadDetalle["personas"][number];

// ---------------------------------------------------------------------------

/**
 * La contraseña de Infonavit. Nunca se manda al navegador con la página:
 * viaja solo cuando la pides, y esa consulta queda en bitácora.
 */
function Password({
  personaId,
  propiedadId,
  tieneGuardada,
}: {
  personaId: string;
  propiedadId: string;
  tieneGuardada: boolean;
}) {
  const [estado, accion, pendiente] = useActionState<ResultadoRevelar | null, FormData>(
    revelarPassword,
    null
  );
  const [visible, setVisible] = useState(false);

  if (!tieneGuardada) {
    return (
      <p className="text-xs text-slate-500">
        Sin contraseña guardada. Escríbela arriba para guardarla cifrada.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color="emerald">Guardada y cifrada</Badge>

        <form action={accion}>
          <input type="hidden" name="personaId" value={personaId} />
          <button
            type="submit"
            disabled={pendiente}
            onClick={() => setVisible(true)}
            className="rounded-xl border border-linea px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-60"
          >
            {pendiente ? "Descifrando…" : "Ver contraseña"}
          </button>
        </form>

        <form action={borrarPassword}>
          <input type="hidden" name="personaId" value={personaId} />
          <input type="hidden" name="propiedadId" value={propiedadId} />
          <button
            type="submit"
            className="rounded-xl border border-linea px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
          >
            Borrarla
          </button>
        </form>
      </div>

      {visible && estado?.ok === true ? (
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="font-mono text-sm break-all">{estado.password}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-xs text-amber-800">
              Esta consulta quedó registrada en la bitácora.
            </span>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              Ocultar
            </button>
          </div>
        </div>
      ) : null}

      {estado?.ok === false ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FichaPersona({ v, propiedadId }: { v: Vinculo; propiedadId: string }) {
  const p = v.persona;
  const [estado, accion, pendiente] = useActionState<Resultado | null, FormData>(
    guardarPersona,
    null
  );
  // El régimen solo se pregunta si está casado, y define si firma el cónyuge.
  const [casado, setCasado] = useState(p.estadoCivil === "casado");

  const esComprador = v.rol === "comprador";
  const conInfonavit = esComprador || v.rol === "vendedor";

  return (
    <Card>
      <CardHeader
        titulo={p.nombre}
        extra={
          <div className="flex items-center gap-2">
            <Badge color={esComprador ? "blue" : v.rol === "vendedor" ? "violet" : "slate"}>
              {ROLES_PERSONA.find((r) => r.id === v.rol)?.label ?? v.rol}
            </Badge>
            <form action={desvincularPersona}>
              <input type="hidden" name="vinculoId" value={v.id} />
              <button
                type="submit"
                className="text-xs text-slate-400 hover:text-rose-600"
                title="Quitarla de esta propiedad (no se borra la persona)"
              >
                Quitar
              </button>
            </form>
          </div>
        }
      />

      <form action={accion} className="grid gap-3 px-6 py-5 sm:grid-cols-3">
        <input type="hidden" name="personaId" value={p.id} />
        <input type="hidden" name="propiedadId" value={propiedadId} />

        <Campo etiqueta="Nombre completo" className="sm:col-span-2">
          <input name="nombre" defaultValue={p.nombre} required className={CLASE_CAMPO} />
        </Campo>
        <Campo etiqueta="WhatsApp">
          <input name="telefono" defaultValue={p.telefono ?? ""} className={CLASE_CAMPO} />
        </Campo>

        <Campo etiqueta="CURP">
          <input name="curp" defaultValue={p.curp ?? ""} className={CLASE_CAMPO} />
        </Campo>
        <Campo etiqueta="RFC">
          <input name="rfc" defaultValue={p.rfc ?? ""} className={CLASE_CAMPO} />
        </Campo>
        <Campo etiqueta="Correo">
          <input name="email" defaultValue={p.email ?? ""} className={CLASE_CAMPO} />
        </Campo>

        <Campo etiqueta="Domicilio" className="sm:col-span-3">
          <input name="domicilio" defaultValue={p.domicilio ?? ""} className={CLASE_CAMPO} />
        </Campo>

        {/* Estado civil: define si firma el cónyuge y si aplica el trámite 6 */}
        <Campo etiqueta="Estado civil">
          <select
            name="estadoCivil"
            defaultValue={p.estadoCivil ?? ""}
            onChange={(e) => setCasado(e.target.value === "casado")}
            className={CLASE_CAMPO}
          >
            <option value="">Sin especificar</option>
            {ESTADOS_CIVILES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </Campo>

        {casado ? (
          <>
            <Campo
              etiqueta="Régimen matrimonial"
              nota="Decide si el cónyuge tiene que firmar"
            >
              <select
                name="regimenMatrimonial"
                defaultValue={p.regimenMatrimonial ?? ""}
                className={CLASE_CAMPO}
              >
                <option value="">Sin especificar</option>
                {REGIMENES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Nombre del cónyuge">
              <input
                name="conyugeNombre"
                defaultValue={p.conyugeNombre ?? ""}
                className={CLASE_CAMPO}
              />
            </Campo>
          </>
        ) : (
          <div className="sm:col-span-2" />
        )}

        {/* Crédito Infonavit: del comprador (el que se tramita) y del vendedor
            (el que trae por liquidar). Lo que no se enseña viaja escondido:
            si no, guardar a la persona borraba esos datos. */}
        {conInfonavit ? (
          <>
            <div className="sm:col-span-3 mt-2 border-t border-linea/60 pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Crédito Infonavit
              </h3>
            </div>

            <Campo etiqueta="NSS" nota="Número de seguro social">
              <input name="nss" defaultValue={p.nss ?? ""} className={`${CLASE_CAMPO} tabular`} />
            </Campo>
            <Campo etiqueta="Número de crédito">
              <input
                name="numeroCredito"
                defaultValue={p.numeroCredito ?? ""}
                className={`${CLASE_CAMPO} tabular`}
              />
            </Campo>
            <Campo etiqueta="Usuario del portal">
              <input
                name="infonavitUsuario"
                defaultValue={p.infonavitUsuario ?? ""}
                className={CLASE_CAMPO}
              />
            </Campo>

            <Campo
              etiqueta="Contraseña del portal"
              nota={
                p.infonavitPasswordCifrada
                  ? "Déjala vacía para conservar la guardada"
                  : "Se guarda cifrada; solo tú puedes verla"
              }
              className="sm:col-span-3"
            >
              <input
                type="password"
                name="infonavitPassword"
                autoComplete="new-password"
                placeholder={p.infonavitPasswordCifrada ? "••••••••" : ""}
                className={CLASE_CAMPO}
              />
            </Campo>

          </>
        ) : (
          <>
            <input type="hidden" name="nss" value={p.nss ?? ""} />
            <input type="hidden" name="numeroCredito" value={p.numeroCredito ?? ""} />
            <input type="hidden" name="infonavitUsuario" value={p.infonavitUsuario ?? ""} />
          </>
        )}

        {/* El empleo sostiene la precalificación: solo del comprador. */}
        {esComprador ? (
          <>
            <div className="sm:col-span-3 mt-2 border-t border-linea/60 pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Empleo
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Es lo que sostiene la precalificación.
              </p>
            </div>

            <Campo etiqueta="Dónde trabaja">
              <input name="empleador" defaultValue={p.empleador ?? ""} className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Puesto">
              <input name="puesto" defaultValue={p.puesto ?? ""} className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Antigüedad (meses)">
              <input
                type="number"
                name="antiguedadMeses"
                defaultValue={p.antiguedadMeses ?? ""}
                className={`${CLASE_CAMPO} tabular`}
              />
            </Campo>
            <Campo etiqueta="Ingreso mensual">
              <input
                type="number"
                step="0.01"
                name="ingresoMensual"
                defaultValue={p.ingresoMensual ?? ""}
                className={`${CLASE_CAMPO} tabular`}
              />
            </Campo>
          </>
        ) : (
          <>
            <input type="hidden" name="empleador" value={p.empleador ?? ""} />
            <input type="hidden" name="puesto" value={p.puesto ?? ""} />
            <input type="hidden" name="antiguedadMeses" value={p.antiguedadMeses ?? ""} />
            <input type="hidden" name="ingresoMensual" value={p.ingresoMensual ?? ""} />
          </>
        )}

        <Campo etiqueta="Notas" className="sm:col-span-3">
          <input name="notas" defaultValue={p.notas ?? ""} className={CLASE_CAMPO} />
        </Campo>

        <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pendiente}
            className="rounded-xl bg-tinta px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          {estado?.ok === true ? <Exito>Guardado.</Exito> : null}
          {estado?.ok === false ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
        </div>
      </form>

      {esComprador ? (
        <div className="border-t border-linea/60 px-6 py-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contraseña guardada
          </h3>
          <div className="mt-2">
            <Password
              personaId={p.id}
              propiedadId={propiedadId}
              tieneGuardada={Boolean(p.infonavitPasswordCifrada)}
            />
          </div>
        </div>
      ) : null}

      {esComprador ? <Referencias persona={p} propiedadId={propiedadId} /> : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------

function Referencias({
  persona,
  propiedadId,
}: {
  persona: Vinculo["persona"];
  propiedadId: string;
}) {
  const [estado, accion, pendiente] = useActionState<Resultado | null, FormData>(
    guardarReferencias,
    null
  );

  const r1 = persona.referencias?.find((r) => r.orden === 1);
  const r2 = persona.referencias?.find((r) => r.orden === 2);

  return (
    <form
      action={accion}
      className="border-t border-linea/60 px-6 py-5"
    >
      <input type="hidden" name="personaId" value={persona.id} />
      <input type="hidden" name="propiedadId" value={propiedadId} />

      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Referencias de la solicitud
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Son los trámites 18 y 19. Al capturarlas se marcan solos.
      </p>

      {[
        { n: 1, r: r1 },
        { n: 2, r: r2 },
      ].map(({ n, r }) => (
        <div key={n} className="mt-3 grid gap-2 sm:grid-cols-3">
          <Campo etiqueta={`Referencia ${n} — nombre`}>
            <input name={`nombre${n}`} defaultValue={r?.nombre ?? ""} className={CLASE_CAMPO} />
          </Campo>
          <Campo etiqueta="Teléfono">
            <input name={`telefono${n}`} defaultValue={r?.telefono ?? ""} className={CLASE_CAMPO} />
          </Campo>
          <Campo etiqueta="Parentesco">
            <input
              name={`parentesco${n}`}
              defaultValue={r?.parentesco ?? ""}
              placeholder="Hermano, amigo…"
              className={CLASE_CAMPO}
            />
          </Campo>
        </div>
      ))}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-xl bg-tinta px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : "Guardar referencias"}
        </button>
        {estado?.ok === true ? <Exito>Guardadas.</Exito> : null}
        {estado?.ok === false ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

/**
 * Agregar una persona. Para comprador y vendedor pide de una vez lo que Erick
 * consulta más (NSS, crédito, estado civil…), en vez de agregar primero y
 * editar después. Lo demás (contraseña de Infonavit, empleo, referencias) se
 * captura en su ficha, que aparece arriba en cuanto se agrega.
 */
function Agregar({ propiedadId, rolInicial }: { propiedadId: string; rolInicial?: string }) {
  const [estado, accion, pendiente] = useActionState<Resultado | null, FormData>(
    vincularPersona,
    null
  );
  const rolValido = ROLES_PERSONA.some((r) => r.id === rolInicial) ? rolInicial! : "comprador";
  const [rol, setRol] = useState(rolValido);
  const [casado, setCasado] = useState(false);
  const [vuelta, setVuelta] = useState(0);
  const [ultimo, setUltimo] = useState<Resultado | null>(null);

  // Al agregar bien, el formulario se limpia para capturar al siguiente.
  if (estado !== ultimo) {
    setUltimo(estado);
    if (estado?.ok) {
      setVuelta((n) => n + 1);
      setCasado(false);
    }
  }

  const delTramite = rol === "comprador" || rol === "vendedor";

  return (
    <div id="agregar" className="scroll-mt-24">
      <Card>
        <CardHeader titulo="Agregar una persona" />
        <form key={vuelta} action={accion} className="grid gap-4 px-6 pt-1 pb-6 sm:grid-cols-4">
          <input type="hidden" name="propiedadId" value={propiedadId} />

          <Campo etiqueta="Papel">
            <select
              name="rol"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className={CLASE_CAMPO}
            >
              {ROLES_PERSONA.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Nombre completo" className="sm:col-span-2">
            <input name="nombre" required placeholder="Edgar Vázquez" className={CLASE_CAMPO} />
          </Campo>
          <Campo etiqueta="WhatsApp" nota="Evita confundir tocayos">
            <input name="telefono" inputMode="tel" placeholder="614 123 4567" className={CLASE_CAMPO} />
          </Campo>

          {delTramite ? (
            <>
              <div className="border-t border-linea/60 pt-4 sm:col-span-4">
                <h3 className="text-[13px] font-semibold text-tinta">Datos para el trámite</h3>
                <p className="mt-0.5 text-xs text-tenue">
                  Todo opcional: lo que no tengas ahorita lo completas después en su ficha.
                </p>
              </div>

              <Campo etiqueta="NSS" nota="Número de seguro social">
                <input name="nss" inputMode="numeric" className={`${CLASE_CAMPO} tabular`} />
              </Campo>
              <Campo etiqueta="Número de crédito">
                <input name="numeroCredito" inputMode="numeric" className={`${CLASE_CAMPO} tabular`} />
              </Campo>
              <Campo etiqueta="CURP">
                <input name="curp" autoCapitalize="characters" className={CLASE_CAMPO} />
              </Campo>
              <Campo etiqueta="RFC">
                <input name="rfc" autoCapitalize="characters" className={CLASE_CAMPO} />
              </Campo>

              <Campo etiqueta="Estado civil" nota="Si es casado se abren los documentos de su cónyuge">
                <select
                  name="estadoCivil"
                  defaultValue=""
                  onChange={(e) => setCasado(e.target.value === "casado")}
                  className={CLASE_CAMPO}
                >
                  <option value="">Sin especificar</option>
                  {ESTADOS_CIVILES.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </Campo>
              {casado ? (
                <>
                  <Campo etiqueta="Régimen">
                    <select name="regimenMatrimonial" defaultValue="" className={CLASE_CAMPO}>
                      <option value="">Sin especificar</option>
                      {REGIMENES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo etiqueta="Nombre del cónyuge" className="sm:col-span-2">
                    <input name="conyugeNombre" className={CLASE_CAMPO} />
                  </Campo>
                </>
              ) : null}
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1 sm:col-span-4">
            <button type="submit" disabled={pendiente} className={BOTON_PRIMARIO}>
              {pendiente ? "Agregando…" : "Agregar"}
            </button>
            {estado?.ok ? <span className="text-sm text-emerald-700">Agregado. Su ficha está arriba.</span> : null}
          </div>
          {estado?.ok === false ? (
            <div className="sm:col-span-4">
              <ErrorCampo>{estado.error}</ErrorCampo>
            </div>
          ) : null}
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Operacion({ p }: { p: PropiedadDetalle }) {
  const [estado, accion, pendiente] = useActionState<Resultado | null, FormData>(
    guardarOperacion,
    null
  );

  return (
    <Card>
      <CardHeader titulo="Datos del trato" />
      <form action={accion} className="grid gap-3 px-6 py-5 sm:grid-cols-3">
        <input type="hidden" name="propiedadId" value={p.id} />

        <Campo etiqueta="Notaría">
          <input name="notaria" defaultValue={p.notaria ?? ""} className={CLASE_CAMPO} />
        </Campo>
        <Campo etiqueta="Fecha de firma programada">
          <input
            type="date"
            name="fechaFirmaProgramada"
            defaultValue={
              p.fechaFirmaProgramada
                ? p.fechaFirmaProgramada.toISOString().slice(0, 10)
                : ""
            }
            className={CLASE_CAMPO}
          />
        </Campo>
        <Campo
          etiqueta="Saldo del vendedor a liberar"
          nota="Lo que debe a Infonavit"
        >
          <input
            type="number"
            step="0.01"
            name="saldoCreditoVendedor"
            defaultValue={p.saldoCreditoVendedor ?? ""}
            className={`${CLASE_CAMPO} tabular`}
          />
        </Campo>

        <Campo etiqueta="Crédito autorizado al comprador">
          <input
            type="number"
            step="0.01"
            name="montoCreditoComprador"
            defaultValue={p.montoCreditoComprador ?? ""}
            className={`${CLASE_CAMPO} tabular`}
          />
        </Campo>
        <Campo etiqueta="Enganche">
          <input
            type="number"
            step="0.01"
            name="enganche"
            defaultValue={p.enganche ?? ""}
            className={`${CLASE_CAMPO} tabular`}
          />
        </Campo>

        <div className="flex items-end pb-1 text-xs text-slate-500">
          {p.montoCreditoComprador != null && p.enganche != null ? (
            <span>
              Cubre {mxn(p.montoCreditoComprador + p.enganche)} del precio
            </span>
          ) : null}
        </div>

        <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pendiente}
            className="rounded-xl bg-tinta px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          {estado?.ok === true ? <Exito>Guardado.</Exito> : null}
          {estado?.ok === false ? <ErrorCampo>{estado.error}</ErrorCampo> : null}
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------

export function Personas({
  propiedad,
  rolInicial,
}: {
  propiedad: PropiedadDetalle;
  /** Papel preseleccionado al llegar desde "Sin comprador · Agregar". */
  rolInicial?: string;
}) {
  // Comprador primero, luego vendedor, luego el resto.
  const ORDEN = ["comprador", "vendedor", "socio"];
  const peso = (rol: string) => {
    const i = ORDEN.indexOf(rol);
    return i === -1 ? ORDEN.length : i;
  };
  const personas = [...propiedad.personas].sort((a, b) => peso(a.rol) - peso(b.rol));

  // Avisos que se descubren tarde y atoran un cierre.
  const avisos: string[] = [];
  for (const v of personas) {
    const p = v.persona;
    if (p.estadoCivil === "casado" && !p.regimenMatrimonial) {
      avisos.push(
        `Falta el régimen matrimonial de ${p.nombre}: define si el cónyuge tiene que firmar.`
      );
    }
    if (v.rol === "comprador" && !p.nss) {
      avisos.push(`Falta el NSS de ${p.nombre}: sin eso no se mueve el crédito.`);
    }
  }

  return (
    <div className="space-y-4">
      {avisos.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <ul className="space-y-1 text-sm text-amber-800">
            {avisos.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Operacion p={propiedad} />

      {personas.length === 0 ? (
        <Card>
          <Vacio>
            Todavía no hay personas en esta operación. Agrega al comprador y al
            vendedor abajo.
          </Vacio>
        </Card>
      ) : (
        personas.map((v) => (
          <FichaPersona key={v.id} v={v} propiedadId={propiedad.id} />
        ))
      )}

      <Agregar propiedadId={propiedad.id} rolInicial={rolInicial} />

      <p className="text-xs text-slate-500">
        Esta pestaña solo la ve el administrador. El ayudante nunca ve NSS,
        contraseñas ni referencias, aunque tenga acceso a la propiedad.
      </p>
    </div>
  );
}

