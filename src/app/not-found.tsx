import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-brick-800 text-base font-bold text-gold-400">
        B
      </div>
      <h1 className="mt-5 text-lg font-semibold">Esta página no existe</h1>
      <p className="mt-2 text-sm text-slate-500">
        Puede que el link esté incompleto o que la casa ya no esté publicada.
      </p>
      <Link
        href="/casas"
        className="mx-auto mt-5 rounded-xl bg-tinta px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Ver las casas disponibles
      </Link>
    </main>
  );
}
