import { ArrowDown, CircleCheck, ShieldCheck } from "lucide-react";
import { validarToken, registrarAcceso } from "@/lib/invitaciones";
import { aceptarAviso } from "./actions";
import { SubirForm } from "./subir-form";

export const dynamic = "force-dynamic";

// Portal del comprador o vendedor. Diseñado para alguien que entra desde el
// celular, en la calle, y que nunca ha tramitado un crédito.
//
// Reglas que gobiernan esta pantalla:
//   · Solo ve SUS documentos, nunca el expediente completo ni nada de dinero.
//   · Nada de jerga: "Constancia de Situación Fiscal" viene con su explicación.
//   · Un toque para subir. Elige archivo y se manda solo.

const MOTIVOS: Record<string, { titulo: string; texto: string }> = {
  no_existe: {
    titulo: "Este link no es válido",
    texto: "Puede que esté incompleto. Revisa que lo hayas copiado entero.",
  },
  revocada: {
    titulo: "Este link ya fue reemplazado",
    texto: "Se generó uno nuevo. Pídele a Erick que te lo reenvíe por WhatsApp.",
  },
  expirada: {
    titulo: "Este link ya venció",
    texto: "Por seguridad los links caducan. Pídele uno nuevo a Erick.",
  },
};

const BOTON_NEGRO =
  "flex w-full items-center justify-center gap-2 rounded-2xl bg-tinta px-5 py-4 text-[15px] font-semibold text-white transition-all duration-150 hover:bg-slate-800 active:scale-[0.99]";

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brick-800 text-sm font-bold text-gold-400">
        B
      </span>
      <span className="font-semibold tracking-tight">Grupo Brick</span>
    </div>
  );
}

/** Barra fija abajo, con el botón negro al alcance del pulgar. */
function BarraInferior({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea/60 bg-white/85 backdrop-blur-md">
      <div className="mx-auto max-w-lg px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brick-800 text-lg font-bold text-gold-400">
        B
      </span>
      <h1 className="mt-6 text-xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-sm leading-relaxed text-tenue">{texto}</p>
    </main>
  );
}

export default async function PortalInvitado({
  params,
}: PageProps<"/subir/[token]">) {
  const { token } = await params;
  const validacion = await validarToken(token);

  if (!validacion.ok) {
    const m = MOTIVOS[validacion.motivo];
    return <Aviso titulo={m.titulo} texto={m.texto} />;
  }

  const { invitacion, tramites } = validacion;
  await registrarAcceso(invitacion.id);

  const primerNombre = invitacion.persona.nombre.split(" ")[0];

  // --- Aviso de privacidad: se acepta antes de poder subir nada (LFPDPPP) ---
  if (!invitacion.avisoAceptadoEn) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 pt-10 pb-36">
        <Marca />
        <h1 className="mt-10 text-[28px] leading-tight font-bold tracking-tight">
          Hola, {primerNombre}
        </h1>
        <p className="mt-2 text-[15px] text-tenue">
          Antes de empezar, necesitamos tu autorización.
        </p>

        <section className="mt-8 rounded-tarjeta bg-white p-6 text-sm leading-relaxed shadow-suave ring-1 ring-black/[0.03]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
            <h2 className="text-[15px] font-semibold">Aviso de privacidad</h2>
          </div>
          <p className="mt-4 text-slate-600">
            Grupo Brick va a recibir y guardar los documentos que subas aquí con
            un solo fin: <strong className="text-tinta">tramitar la operación de {invitacion.propiedad.nombre}</strong>.
          </p>
          <ul className="mt-4 space-y-3 text-slate-600">
            {[
              "Solo se usan para este trámite, ante Infonavit, la notaría y las dependencias que lo requieran.",
              "No se venden ni se comparten con nadie más.",
              "Puedes pedir en cualquier momento que te digamos qué tenemos tuyo, que lo corrijamos o que lo borremos, al 614 496 7308.",
              "Se conservan el tiempo que exige el trámite y las obligaciones legales que siguen a la compraventa.",
            ].map((punto) => (
              <li key={punto} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                <span>{punto}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 text-center text-xs text-tenue">
          Si no estás de acuerdo, cierra esta página y avísale a Erick.
        </p>

        <BarraInferior>
          <form action={aceptarAviso}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className={BOTON_NEGRO}>
              Acepto y quiero continuar
            </button>
          </form>
        </BarraInferior>
      </main>
    );
  }

  // --- Checklist ------------------------------------------------------------
  const conDocumento = tramites.filter((t) =>
    t.documentos.some((d) => d.estado !== "rechazado")
  );
  const aprobados = tramites.filter((t) =>
    t.documentos.some((d) => d.estado === "aprobado")
  );
  const faltan = tramites.length - conDocumento.length;
  const porcentaje =
    tramites.length === 0
      ? 0
      : Math.round((conDocumento.length / tramites.length) * 100);
  const siguiente = tramites.find((t) => !t.documentos.some((d) => d.estado !== "rechazado"));

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-10 pb-36">
      <Marca />

      <h1 className="mt-10 text-[28px] leading-tight font-bold tracking-tight">
        Hola, {primerNombre}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-tenue">
        Estos son los documentos para <strong className="text-tinta">{invitacion.propiedad.nombre}</strong>.
        Puedes tomarles foto con el celular.
      </p>

      {/* Avance */}
      <section className="mt-8 rounded-tarjeta bg-white p-6 shadow-suave ring-1 ring-black/[0.03]">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold">
            {conDocumento.length} de {tramites.length} entregados
          </span>
          <span className="rounded-full bg-[#e6f4ea] px-2 py-0.5 text-xs font-semibold text-emerald-700 tabular">
            {porcentaje}%
          </span>
        </div>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-tinta transition-[width] duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-tenue">
          {faltan === 0
            ? aprobados.length === tramites.length
              ? "Ya está todo revisado y aprobado. Gracias."
              : "Ya entregaste todo. Erick está revisando."
            : `Te ${faltan === 1 ? "falta" : "faltan"} ${faltan}.`}
        </p>
      </section>

      {/* La lista */}
      <ul className="mt-6 space-y-4">
        {tramites.map((t) => {
          const vigentes = t.documentos.filter((d) => d.estado !== "rechazado");
          const ultimo = vigentes[0];
          const rechazado = !ultimo
            ? t.documentos.find((d) => d.estado === "rechazado")
            : undefined;

          return (
            <li
              key={t.id}
              id={`doc-${t.id}`}
              className="scroll-mt-6 rounded-tarjeta bg-white p-6 shadow-suave ring-1 ring-black/[0.03]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold tracking-tight">{t.catalogo.nombre}</h2>
                  {t.catalogo.ayudaInvitado ? (
                    <p className="mt-1 text-sm leading-relaxed text-tenue">
                      {t.catalogo.ayudaInvitado}
                    </p>
                  ) : null}
                </div>

                {ultimo?.estado === "aprobado" ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <CircleCheck className="h-3.5 w-3.5" strokeWidth={2} />
                    Aprobado
                  </span>
                ) : ultimo ? (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    En revisión
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-tenue">
                    Falta
                  </span>
                )}
              </div>

              {rechazado ? (
                <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm">
                  <p className="font-semibold text-rose-700">Hay que volver a subirlo</p>
                  <p className="mt-1 text-rose-600">
                    {rechazado.motivoRechazo ?? "No se pudo usar el archivo anterior."}
                  </p>
                </div>
              ) : null}

              {ultimo?.estado === "aprobado" ? null : (
                <SubirForm token={token} tramiteId={t.id} yaSubido={Boolean(ultimo)} />
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-center text-xs text-tenue">
        ¿Dudas? Escríbele a Erick al 614 496 7308.
      </p>

      <BarraInferior>
        {siguiente ? (
          <a href={`#doc-${siguiente.id}`} className={BOTON_NEGRO}>
            Subir documento: {siguiente.catalogo.nombre.length > 28
              ? `${siguiente.catalogo.nombre.slice(0, 26)}…`
              : siguiente.catalogo.nombre}
            <ArrowDown className="h-4 w-4 shrink-0" strokeWidth={2} />
          </a>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e6f4ea] px-5 py-4 text-[15px] font-semibold text-emerald-700">
            <CircleCheck className="h-5 w-5" strokeWidth={2} />
            Todo entregado
          </div>
        )}
      </BarraInferior>
    </main>
  );
}
