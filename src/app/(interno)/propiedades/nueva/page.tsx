import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { FormaNuevaPropiedad } from "@/components/formularios";
import { exigirAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

// Alta de una propiedad desde la app. Antes solo entraban leyéndolas de las
// carpetas de Windows con prod:sembrar.

export default async function NuevaPropiedad() {
  await exigirAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/propiedades"
          className="inline-flex items-center gap-1 text-sm text-tenue transition-colors hover:text-tinta"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          Propiedades
        </Link>
        <h1 className="mt-3 text-[28px] leading-tight font-bold tracking-tight">Nueva propiedad</h1>
        <p className="mt-1 text-sm text-tenue">
          Lo básico para arrancar. Precio de venta, presupuesto y lo demás lo
          capturas después, en la pestaña Datos.
        </p>
      </div>

      <Card>
        <CardHeader titulo="Datos generales" />
        <FormaNuevaPropiedad />
      </Card>
    </div>
  );
}
