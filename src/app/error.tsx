"use client";

// Red de seguridad de toda la app. Sin esto, cualquier error que se escape
// muestra la pantalla genérica de Next, en inglés — y el comprador la vería
// a media subida de documentos.

export default function ErrorGlobal({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-gold-500 text-base font-bold text-brick-900">
        B
      </div>
      <h1 className="mt-5 text-lg font-semibold">Algo salió mal</h1>
      <p className="mt-2 text-sm text-slate-500">
        No se pudo completar la acción. Vuelve a intentarlo; si sigue igual,
        avísale a Erick al 614 496 7308.
      </p>
      <button
        onClick={reset}
        className="mx-auto mt-5 rounded-lg bg-brick-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-brick-700"
      >
        Intentar otra vez
      </button>
    </main>
  );
}
