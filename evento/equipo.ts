import type { Organizador } from "@/config/contenido";

/**
 * El equipo organizador, en el orden en que sale en la portada.
 *
 * Las fotos van en `public/evento/equipo/`. Sin `foto` se muestra un avatar
 * generado a partir del `id`.
 */
export const equipo: Organizador[] = [
  {
    id: "ana-ejemplo",
    nombre: "Ana Ejemplo",
    rol: "Student Builder Group Leader",
    pais: "CO",
    redes: { linkedin: "https://www.linkedin.com/", github: "https://github.com/" },
  },
  {
    id: "luis-muestra",
    nombre: "Luis Muestra",
    rol: "Student Builder Group Leader",
    pais: "CO",
    redes: { linkedin: "https://www.linkedin.com/" },
  },
  {
    id: "sofia-demo",
    nombre: "Sofía Demo",
    rol: "Core Team Member",
    pais: "CO",
    redes: { instagram: "https://www.instagram.com/" },
  },
  {
    id: "mateo-prueba",
    nombre: "Mateo Prueba",
    rol: "Volunteer",
    pais: "CO",
  },
];
