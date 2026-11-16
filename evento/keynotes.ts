import type { Keynote } from "@/config/contenido";

/**
 * Los keynotes. El orden es el diseño de la sección: el primero sale en la
 * tarjeta grande y el resto en parejas debajo. Con la lista vacía la sección
 * no se muestra.
 *
 * Las fotos van en `public/evento/keynotes/`. Sin foto salen las iniciales.
 */
export const keynotes: Keynote[] = [
  {
    nombre: "Valentina",
    apellido: "Ríos",
    cargo: "Developer Advocate",
    empresa: "AWS",
    tipoCharla: "Keynote de apertura",
    tituloCharla: "Tu primer año en la nube",
    delPrograma: true,
  },
  {
    nombre: "Andrés",
    apellido: "Morales",
    cargo: "Solutions Architect",
    empresa: "AWS",
    delPrograma: true,
  },
  {
    nombre: "Camila",
    apellido: "Torres",
    cargo: "AWS Community Builder",
    empresa: "Comunidad",
    tipoCharla: "Seguridad",
    tituloCharla: "Lo que aprendí rompiendo mi propia cuenta",
  },
];
