import "server-only";
/** Nombre de la cookie de sesión del panel. Aparte de `auth.ts` porque también la lee `proxy.ts`. */
export const COOKIE_SESION = "cd-sesion";

/** Lo que dura una sesión, en segundos. */
export const DURACION_SESION = 60 * 60 * 24;
