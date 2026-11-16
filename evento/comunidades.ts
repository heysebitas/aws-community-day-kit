import type { Comunidad } from "@/config/contenido";

/**
 * Las comunidades aliadas: no pagan, ponen gente y difusión, así que no llevan
 * niveles. Con la lista vacía la sección no se muestra.
 *
 * Los logos van en `public/evento/comunidades/` y se pintan a su color sobre el
 * bloque del tema: uno blanco no se va a leer.
 */
export const comunidades: Comunidad[] = [
  { id: "comunidad-cloud", nombre: "Comunidad Cloud", logo: "/evento/comunidades/comunidad-cloud.svg", url: "" },
  { id: "devs-locales", nombre: "Devs Locales", logo: "/evento/comunidades/devs-locales.svg", url: "" },
  { id: "mujeres-en-tech", nombre: "Mujeres en Tech", logo: "/evento/comunidades/mujeres-en-tech.svg", url: "" },
  { id: "open-source", nombre: "Open Source", logo: "/evento/comunidades/open-source.svg", url: "" },
];
