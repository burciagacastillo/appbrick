import Link from "next/link";
import { UserRound } from "lucide-react";
import { Card } from "./ui";
import { BotonCopiar } from "./copiar";
import { NotaRapida } from "./nota-rapida";
import type { PropiedadDetalle } from "@/lib/queries";
import { estadoCivil, regimen } from "@/lib/constants";

// Lo que Erick consulta más seguido al entrar a una propiedad: quién compra,
// quién vende, sus NSS y números de crédito — con botón de copiar — y una
// nota rápida. Solo admin (la página ya lo exige).
//
// OJO: la persona completa trae la contraseña de Infonavit (cifrada). A los
// componentes de cliente solo se les pasa el texto que copian, nunca la persona.

type Rol = "comprador" | "vendedor";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-tenue">{etiqueta}</div>
        <div className={`truncate font-mono text-sm tabular ${valor ? "text-tinta" : "text-slate-300"}`}>
          {valor ?? "Sin capturar"}
        </div>
      </div>
      {valor ? <BotonCopiar texto={valor} etiqueta={etiqueta} /> : null}
    </div>
  );
}

/**
 * Soltero, casado y su régimen. Si es casado, en el expediente se abren solos
 * los documentos de su cónyuge (src/lib/conyuge.ts). Se captura en Personas.
 */
function EstadoCivil({
  estadoCivilId,
  regimenId,
  conyuge,
  propiedadId,
}: {
  estadoCivilId: string | null;
  regimenId: string | null;
  conyuge: string | null;
  propiedadId: string;
}) {
  const ec = estadoCivil(estadoCivilId);
  const rg = regimen(regimenId);
  const personas = `/propiedades/${encodeURIComponent(propiedadId)}?tab=personas`;

  if (!ec) {
    return (
      <Link href={personas} className="mt-1 ml-9 inline-block text-xs text-amber-700 hover:underline">
        Falta estado civil · capturar →
      </Link>
    );
  }

  const casado = ec.id === "casado";
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-9 text-xs">
      <span
        className={`rounded-full px-2 py-0.5 font-medium ${
          casado ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-tenue"
        }`}
      >
        {ec.label}
      </span>
      {casado ? (
        rg ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-tenue">{rg.label}</span>
        ) : (
          <Link href={personas} className="text-amber-700 hover:underline">
            Falta régimen →
          </Link>
        )
      ) : null}
      {casado && conyuge ? <span className="text-tenue">Cónyuge: {conyuge}</span> : null}
    </div>
  );
}

function Lado({
  rol,
  personas,
  propiedadId,
}: {
  rol: Rol;
  personas: PropiedadDetalle["personas"];
  propiedadId: string;
}) {
  const titulo = rol === "comprador" ? "Comprador" : "Vendedor";
  const deEsteLado = personas.filter((pp) => pp.rol === rol);

  return (
    <div className="min-w-0">
      <div className="text-[13px] font-medium text-tenue">
        {deEsteLado.length > 1 ? `${titulo}es` : titulo}
      </div>

      {deEsteLado.length === 0 ? (
        <Link
          href={`/propiedades/${encodeURIComponent(propiedadId)}?tab=personas&rol=${rol}#agregar`}
          className="mt-2 inline-flex text-sm text-slate-400 hover:text-tinta"
        >
          Sin {titulo.toLowerCase()} · Agregar →
        </Link>
      ) : (
        <ul className="mt-2 space-y-3">
          {deEsteLado.map(({ persona }) => (
            <li key={persona.id}>
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-tenue">
                  <UserRound className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                <span className="truncate font-semibold tracking-tight">{persona.nombre}</span>
              </div>
              <EstadoCivil
                estadoCivilId={persona.estadoCivil}
                regimenId={persona.regimenMatrimonial}
                conyuge={persona.conyugeNombre}
                propiedadId={propiedadId}
              />
              <div className="mt-1 divide-y divide-slate-100 pl-9">
                <Dato etiqueta="NSS" valor={persona.nss} />
                <Dato etiqueta="Número de crédito" valor={persona.numeroCredito} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DatosClave({ propiedad }: { propiedad: PropiedadDetalle }) {
  return (
    <Card className="p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Lado rol="comprador" personas={propiedad.personas} propiedadId={propiedad.id} />
        <Lado rol="vendedor" personas={propiedad.personas} propiedadId={propiedad.id} />
      </div>
      <div className="mt-6 border-t border-linea/60 pt-5">
        <NotaRapida propiedadId={propiedad.id} notas={propiedad.notas ?? ""} />
      </div>
    </Card>
  );
}
