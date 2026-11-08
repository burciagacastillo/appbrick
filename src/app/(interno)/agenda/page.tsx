import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, Encabezado, Vacio, BOTON_SECUNDARIO } from "@/components/ui";
import { FilaEvento } from "@/components/agenda";
import { eventosAgenda } from "@/lib/queries";
import {
  armarSemana,
  armarMes,
  diaCorto,
  etiquetaDia,
  etiquetaPaso,
  hoy,
  mesDe,
  mesValido,
  mesVecino,
  nombreMes,
  rangoDelMes,
  sumarDias,
  type Evento,
} from "@/lib/agenda";
import { exigirAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

// La agenda de todas las propiedades activas: pasos, firmas, cierres y
// documentos que se vencen. "Esta semana" para el día a día; "Mes" para ver
// lo que viene. Los días son de Chihuahua (src/lib/agenda.ts).

const VISTAS = [
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Mes" },
] as const;

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function Pestanas({ actual }: { actual: string }) {
  return (
    <div className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-suave ring-1 ring-black/[0.03]">
      {VISTAS.map((v) => (
        <Link
          key={v.id}
          href={`/agenda?vista=${v.id}`}
          aria-current={actual === v.id ? "page" : undefined}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            actual === v.id ? "bg-tinta text-white" : "text-tenue hover:bg-slate-50 hover:text-tinta"
          }`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}

async function Semana() {
  const hoyDia = hoy();
  const eventos = await eventosAgenda({ desde: hoyDia, hasta: sumarDias(hoyDia, 6) });
  const { atrasados, dias, sinFecha } = armarSemana(eventos, hoyDia);
  const nada = atrasados.length === 0 && dias.every((d) => d.eventos.length === 0) && sinFecha.length === 0;

  if (nada) {
    return (
      <Card>
        <Vacio icono={<CalendarDays className="h-6 w-6" strokeWidth={1.5} />} titulo="Semana libre">
          Agrega pasos con fecha desde cada propiedad (sección Pasos) y aquí aparecen.
        </Vacio>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {atrasados.length > 0 ? (
        <Card className="ring-rose-200">
          <CardHeader titulo={`Atrasados (${atrasados.length})`} />
          <ul className="divide-y divide-slate-100 px-6 pb-4">
            {atrasados.map((e) => (
              <FilaEvento key={e.clave} e={e} cuando={etiquetaPaso(e.dia, hoyDia)?.texto} atrasado />
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <ul className="divide-y divide-slate-100">
          {dias.map(({ dia, eventos: delDia }) => (
            <li key={dia} className="px-6 py-4">
              <div className="flex items-baseline gap-2">
                <span className={`text-sm font-semibold ${dia === hoyDia ? "text-tinta" : "text-tenue"}`}>
                  {etiquetaDia(dia, hoyDia)}
                </span>
                {dia === hoyDia || dia === sumarDias(hoyDia, 1) ? (
                  <span className="text-xs text-tenue">{diaCorto(dia)}</span>
                ) : null}
              </div>
              {delDia.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400">—</p>
              ) : (
                <ul className="mt-1">
                  {delDia.map((e) => (
                    <FilaEvento key={e.clave} e={e} />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {sinFecha.length > 0 ? (
        <Card>
          <details className="px-6 py-4">
            <summary className="cursor-pointer text-sm font-semibold text-tinta">
              Pendientes sin fecha ({sinFecha.length})
            </summary>
            <ul className="mt-2 divide-y divide-slate-100">
              {sinFecha.map((e) => (
                <FilaEvento key={e.clave} e={e} />
              ))}
            </ul>
          </details>
        </Card>
      ) : null}
    </div>
  );
}

const ESTILO_PASTILLA: Record<Evento["tipo"], string> = {
  paso: "bg-slate-100 text-tinta",
  firma: "bg-indigo-50 text-indigo-700",
  cierre: "bg-teal-50 text-teal-700",
  vence: "bg-amber-50 text-amber-800",
};

async function Mes({ mes }: { mes: string }) {
  const hoyDia = hoy();
  const eventos = await eventosAgenda(rangoDelMes(mes));
  const semanas = armarMes(eventos, mes, hoyDia);
  const conEventos = semanas.flat().filter((d) => d.delMes && d.eventos.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/agenda?vista=mes&mes=${mesVecino(mes, -1)}`} className={BOTON_SECUNDARIO} aria-label="Mes anterior">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <Link href={`/agenda?vista=mes&mes=${mesVecino(mes, 1)}`} className={BOTON_SECUNDARIO} aria-label="Mes siguiente">
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <h2 className="ml-1 text-lg font-semibold tracking-tight capitalize">{nombreMes(mes)}</h2>
        {mes !== mesDe(hoyDia) ? (
          <Link href="/agenda?vista=mes" className="ml-auto text-sm text-tenue hover:text-tinta">
            Ir a hoy
          </Link>
        ) : null}
      </div>

      {/* Cuadrícula (pantallas medianas y grandes) */}
      <Card className="hidden overflow-hidden sm:block">
        <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium text-tenue">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {semanas.map((semana) => (
          <div key={semana[0].dia} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
            {semana.map((d) => (
              <div
                key={d.dia}
                className={`min-h-28 border-r border-slate-100 p-1.5 last:border-r-0 ${d.delMes ? "" : "bg-slate-50/60"}`}
              >
                <div
                  className={`mb-1 inline-grid h-6 w-6 place-items-center rounded-full text-xs tabular ${
                    d.esHoy ? "bg-tinta font-semibold text-white" : d.delMes ? "text-tinta" : "text-slate-300"
                  }`}
                >
                  {Number(d.dia.slice(8))}
                </div>
                <ul className="space-y-1">
                  {d.eventos.slice(0, 3).map((e) => (
                    <li key={e.clave}>
                      <Link
                        href={`/propiedades/${encodeURIComponent(e.propiedadId)}`}
                        title={`${e.titulo} — ${e.propiedadNombre}`}
                        className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight ${ESTILO_PASTILLA[e.tipo]} ${
                          e.hecho ? "line-through opacity-60" : ""
                        }`}
                      >
                        {e.hora ? `${e.hora} ` : ""}
                        {e.titulo}
                      </Link>
                    </li>
                  ))}
                  {d.eventos.length > 3 ? (
                    <li className="px-1.5 text-[11px] text-tenue">+{d.eventos.length - 3} más</li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </Card>

      {/* Lista (celular): solo los días que tienen algo */}
      <div className="sm:hidden">
        {conEventos.length === 0 ? (
          <Card>
            <Vacio>Nada en {nombreMes(mes)}.</Vacio>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-slate-100">
              {conEventos.map((d) => (
                <li key={d.dia} className="px-5 py-3">
                  <div className={`text-sm font-semibold ${d.esHoy ? "text-tinta" : "text-tenue"}`}>
                    {etiquetaDia(d.dia, hoyDia)}
                  </div>
                  <ul>
                    {d.eventos.map((e) => (
                      <FilaEvento key={e.clave} e={e} />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

export default async function Agenda({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await exigirAdmin();
  const sp = await searchParams;
  const vista = sp.vista === "mes" ? "mes" : "semana";
  const mes = mesValido(sp.mes) ? sp.mes : mesDe(hoy());

  return (
    <div className="space-y-8">
      <Encabezado
        titulo="Agenda"
        descripcion="Pasos, firmas, cierres y documentos por vencer de tus propiedades activas"
      />
      <Pestanas actual={vista} />
      {vista === "semana" ? <Semana /> : <Mes mes={mes} />}
    </div>
  );
}
