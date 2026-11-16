/**
 * Los buzones del evento.
 *
 * Este archivo sólo se lee en el servidor: las direcciones llegan al navegador
 * codificadas y el enlace `mailto:` se arma después de cargar la página, para
 * que no queden escritas en el HTML que recogen los rastreadores de spam. Por
 * eso no están en `config.ts`, que sí se importa desde el navegador.
 */
export const contacto = {
  general: "contacto@example.com",
  privacidad: "privacidad@example.com",
  patrocinios: "patrocinios@example.com",
};
