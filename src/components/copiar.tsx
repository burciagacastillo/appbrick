"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Botón de copiar: para el NSS, el número de crédito y la nota rápida, que
// Erick pega todo el día en el portal de Infonavit y en WhatsApp.

async function alPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegadores viejos o sin permiso: el método de antes.
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  }
}

export function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      disabled={!texto}
      onClick={async () => {
        if (await alPortapapeles(texto)) {
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        }
      }}
      title={`Copiar ${etiqueta}`}
      aria-label={`Copiar ${etiqueta}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 ${
        copiado
          ? "bg-[#e6f4ea] text-emerald-700"
          : "text-tenue ring-1 ring-inset ring-linea hover:bg-slate-50 hover:text-tinta"
      }`}
    >
      {copiado ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
      )}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}
