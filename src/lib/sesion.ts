import "server-only";
/** Nombre anterior de la cookie: se sigue leyendo para no cerrar las sesiones abiertas. */
export const COOKIE_SESION_VIEJA = "cd-sesion";

/** `__Host-` obliga a `Secure`, `Path=/` y sin `Domain`: solo en producción, donde hay https. */
export function nombreCookieSesion(produccion: boolean): string {
  return produccion ? `__Host-${COOKIE_SESION_VIEJA}` : COOKIE_SESION_VIEJA;
}

/** Nombre de la cookie de sesión del panel. Aparte de `auth.ts` porque también la lee `proxy.ts`. */
export const COOKIE_SESION = nombreCookieSesion(process.env.NODE_ENV === "production");

/** El token de la cookie nueva o, si no está, el de la vieja. */
export function leerTokenSesion(get: (nombre: string) => { value: string } | undefined): string | undefined {
  return get(COOKIE_SESION)?.value || get(COOKIE_SESION_VIEJA)?.value || undefined;
}

/** Lo que dura una sesión, en segundos. */
export const DURACION_SESION = 60 * 60 * 24;
