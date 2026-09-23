import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { usuarioActual } from "@/lib/sesion";
import { prepararSegundoFactor } from "@/lib/segundo-factor";
import { uriParaApp } from "@/lib/totp";
import { confirmarSegundoFactor } from "@/acciones/sesion";
import { FormaCodigo } from "@/components/forma-codigo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Segundo factor — Grupo Brick" };

// Activación del segundo factor. Vive fuera de (interno) a propósito: en
// producción el admin sin segundo factor no puede abrir NINGUNA página
// interna, así que esta tiene que ser alcanzable sin pasar por esas puertas.

export default async function SegundoFactor() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar");

  if (usuario.totpActivo) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">Tu segundo factor ya está activo</h1>
        <p className="mt-2 text-sm text-slate-500">
          Cada vez que entres te va a pedir el código de tu app.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          ¿Perdiste el celular? Desde tu computadora corre{" "}
          <code className="rounded bg-slate-100 px-1">npm run usuario</code>{" "}
          y elige reiniciar el segundo factor.
        </p>
      </main>
    );
  }

  const secreto = await prepararSegundoFactor(usuario.id);
  if (!secreto) redirect("/entrar");

  const uri = uriParaApp(secreto, usuario.email);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  const agrupado = secreto.match(/.{1,4}/g)?.join(" ") ?? secreto;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brick-800 text-sm font-bold text-gold-400">
        B
      </div>
      <h1 className="mt-5 text-xl font-semibold">Activa tu segundo factor</h1>
      <p className="mt-1 text-sm text-slate-500">
        Tu cuenta puede ver las contraseñas de Infonavit de tus compradores. Con
        esto, aunque alguien descubra tu contraseña, no puede entrar sin tu
        celular.
      </p>

      <ol className="mt-6 space-y-5 text-sm">
        <li>
          <p className="font-medium">1. Instala una app autenticadora</p>
          <p className="text-slate-500">
            Google Authenticator o Microsoft Authenticator, gratis en la tienda
            de tu celular.
          </p>
        </li>

        <li>
          <p className="font-medium">2. Escanea este código</p>
          <p className="text-slate-500">En la app: “+” → “Escanear código QR”.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Código QR para la app autenticadora"
            className="mt-3 rounded-xl border border-linea bg-white p-2"
            width={220}
            height={220}
          />
          <details className="mt-2 text-xs text-slate-500">
            <summary className="cursor-pointer">¿No puedes escanear? Tecléalo a mano</summary>
            <p className="mt-1 break-all font-mono text-sm text-slate-700">
              {agrupado}
            </p>
          </details>
        </li>

        <li>
          <p className="font-medium">3. Escribe el código que te muestra la app</p>
          <FormaCodigo accion={confirmarSegundoFactor} boton="Activar" />
        </li>
      </ol>

      <p className="mt-6 text-xs text-slate-500">
        Si pierdes el celular, desde tu computadora con{" "}
        <code className="rounded bg-slate-100 px-1">npm run usuario</code>{" "}
        puedes reiniciarlo. Nadie más puede hacerlo desde internet.
      </p>
    </main>
  );
}
