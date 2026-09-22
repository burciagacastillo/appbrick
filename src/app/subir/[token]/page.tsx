import { validarToken, registrarAcceso } from "@/lib/invitaciones";
import { aceptarAviso } from "./actions";
import { SubirForm } from "./subir-form";

export const dynamic = "force-dynamic";

// Portal del comprador o vendedor. Diseñado para alguien que entra desde el
// celular, en la calle, y que nunca ha tramitado un crédito.
//
// Reglas que gobiernan esta pantalla:
//   · Solo ve SUS documentos, nunca los 34 ni nada de dinero.
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

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gold-500 text-lg font-bold text-brick-900">
        B
      </div>
      <h1 className="mt-4 text-lg font-semibold">{titulo}</h1>
      <p className="mt-2 text-sm text-slate-500">{texto}</p>
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
      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold-500 text-base font-bold text-brick-900">
          B
        </div>
        <h1 className="mt-4 text-xl font-semibold">Hola, {primerNombre}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Antes de empezar, necesitamos tu autorización.
        </p>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed dark:border-brick-700 dark:bg-brick-900">
          <h2 className="font-semibold">Aviso de privacidad</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Grupo Brick va a recibir y guardar los documentos que subas aquí con
            un solo fin: <strong>tramitar la operación de {invitacion.propiedad.nombre}</strong>.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
            <li>
              Solo se usan para este trámite, ante Infonavit, la notaría y las
              dependencias que lo requieran.
            </li>
            <li>No se venden ni se comparten con nadie más.</li>
            <li>
              Puedes pedir en cualquier momento que te digamos qué tenemos tuyo,
              que lo corrijamos o que lo borremos, al{" "}
              <strong>614 496 7308</strong>.
            </li>
            <li>
              Se conservan el tiempo que exige el trámite y las obligaciones
              legales que siguen a la compraventa.
            </li>
          </ul>
        </div>

        <form action={aceptarAviso} className="mt-4">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full rounded-lg bg-brick-800 px-4 py-3 font-medium text-white hover:bg-brick-700"
          >
            Acepto y quiero continuar
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-slate-500">
          Si no estás de acuerdo, cierra esta página y avísale a Erick.
        </p>
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

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold-500 text-sm font-bold text-brick-900">
          B
        </div>
        <span className="font-semibold tracking-tight">Grupo Brick</span>
      </div>

      <h1 className="mt-5 text-xl font-semibold">Hola, {primerNombre}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Estos son los documentos para <strong>{invitacion.propiedad.nombre}</strong>.
        Puedes tomarles foto con el celular.
      </p>

      {/* Avance */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-brick-700 dark:bg-brick-900">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">
            {conDocumento.length} de {tramites.length} entregados
          </span>
          <span className="text-sm text-slate-500 tabular">{porcentaje}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-brick-700">
          <div
            className="h-full rounded-full bg-gold-500 transition-all"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {faltan === 0
            ? aprobados.length === tramites.length
              ? "Ya está todo revisado y aprobado. Gracias."
              : "Ya entregaste todo. Erick está revisando."
            : `Te ${faltan === 1 ? "falta" : "faltan"} ${faltan}.`}
        </p>
      </div>

      {/* La lista */}
      <ul className="mt-4 space-y-3">
        {tramites.map((t) => {
          const vigentes = t.documentos.filter((d) => d.estado !== "rechazado");
          const ultimo = vigentes[0];
          const rechazado = !ultimo
            ? t.documentos.find((d) => d.estado === "rechazado")
            : undefined;

          return (
            <li
              key={t.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-brick-700 dark:bg-brick-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium">{t.catalogo.nombre}</h2>
                  {t.catalogo.ayudaInvitado ? (
                    <p className="mt-0.5 text-sm text-slate-500">
                      {t.catalogo.ayudaInvitado}
                    </p>
                  ) : null}
                </div>

                {ultimo?.estado === "aprobado" ? (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                    ✓ Aprobado
                  </span>
                ) : ultimo ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                    En revisión
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                    Falta
                  </span>
                )}
              </div>

              {rechazado ? (
                <div className="mt-2 rounded-lg bg-rose-50 p-3 text-sm dark:bg-rose-500/10">
                  <p className="font-medium text-rose-800 dark:text-rose-200">
                    Hay que volver a subirlo
                  </p>
                  <p className="mt-0.5 text-rose-700 dark:text-rose-300">
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

      <p className="mt-6 text-center text-xs text-slate-500">
        ¿Dudas? Escríbele a Erick al 614 496 7308.
      </p>
    </main>
  );
}
