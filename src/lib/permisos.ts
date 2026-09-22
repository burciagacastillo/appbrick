import { redirect } from "next/navigation";
import { db } from "./db";
import { usuarioActual, type Sesion } from "./sesion";

// Las puertas. Toda página interna pasa por aquí antes de leer datos.
//
// Regla de diseño: los permisos se piden, no se asumen. Una página que olvide
// llamar a exigirAdmin() no "hereda" permiso de su layout — por eso cada
// función devuelve la sesión, y la página necesita ese valor para seguir.

/** Cualquier usuario con sesión (admin o ayudante). Si no, al login. */
export async function exigirSesion(): Promise<Sesion> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/entrar");
  return usuario;
}

/** Solo admin. El ayudante que llegue aquí se va a su propia pantalla. */
export async function exigirAdmin(): Promise<Sesion> {
  const usuario = await exigirSesion();
  if (!usuario.esAdmin) redirect("/ayudante");
  return usuario;
}

/**
 * Las propiedades que este usuario puede tocar.
 * El admin las ve todas; el ayudante solo las que se le asignaron y que no
 * se le hayan vencido.
 */
export async function propiedadesVisibles(usuario: Sesion): Promise<string[] | "todas"> {
  if (usuario.esAdmin) return "todas";

  const ahora = new Date();
  const accesos = await db.accesoAyudante.findMany({
    where: {
      usuarioId: usuario.id,
      OR: [{ expiraEn: null }, { expiraEn: { gt: ahora } }],
    },
    select: { propiedadId: true },
  });

  return accesos.map((a) => a.propiedadId);
}

/** ¿Puede este usuario ver ESTA propiedad? */
export async function puedeVerPropiedad(
  usuario: Sesion,
  propiedadId: string
): Promise<boolean> {
  const visibles = await propiedadesVisibles(usuario);
  if (visibles === "todas") return true;
  return visibles.includes(propiedadId);
}

/** Igual que la anterior, pero corta la página en vez de devolver false. */
export async function exigirAccesoAPropiedad(
  usuario: Sesion,
  propiedadId: string
): Promise<void> {
  if (!(await puedeVerPropiedad(usuario, propiedadId))) {
    redirect(usuario.esAdmin ? "/propiedades" : "/ayudante");
  }
}

/** Filtro de Prisma que respeta el alcance del usuario. */
export async function filtroPropiedades(usuario: Sesion) {
  const visibles = await propiedadesVisibles(usuario);
  return visibles === "todas" ? {} : { id: { in: visibles } };
}
