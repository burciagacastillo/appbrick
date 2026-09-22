import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-gold-500 text-base font-bold text-brick-900">
        B
      </div>
      <h1 className="mt-5 text-lg font-semibold">Esta página no existe</h1>
      <p className="mt-2 text-sm text-slate-500">
        Puede que el link esté incompleto o que la casa ya no esté publicada.
      </p>
      <Link
        href="/casas"
        className="mx-auto mt-5 rounded-lg bg-brick-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-brick-700"
      >
        Ver las casas disponibles
      </Link>
    </main>
  );
}
