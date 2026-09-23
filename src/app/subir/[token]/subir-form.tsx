"use client";

import { ZonaSubida } from "@/components/zona-subida";
import { prepararSubidaInvitado, subirDocumento } from "./actions";

// Zona de carga del invitado: la misma que usa Erick en el expediente, con
// las acciones del portal (todo cuelga del token del link).

export function SubirForm({
  token,
  tramiteId,
  yaSubido,
}: {
  token: string;
  tramiteId: string;
  yaSubido: boolean;
}) {
  return (
    <div className="mt-4">
      <ZonaSubida
        campos={{ token, tramiteId }}
        preparar={() => prepararSubidaInvitado(token, tramiteId)}
        confirmar={subirDocumento}
        titulo={yaSubido ? "Subir otro para reemplazarlo" : "Toma una foto o elige el archivo"}
      />
    </div>
  );
}
