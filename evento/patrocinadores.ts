import type { Patrocinador } from "@/config/contenido";

/**
 * Los patrocinadores. El nivel decide el tamaño del logo:
 * `diamond` y `platinum` van en la fila de arriba, `gold` en la del medio y
 * `community` en la de abajo.
 *
 * Los logos van en `public/evento/patrocinadores/`, con fondo transparente: la
 * sección los pinta en tinta plana sobre el color del tema.
 */
export const patrocinadores: Patrocinador[] = [
  {
    id: "aws",
    nombre: "Amazon Web Services",
    logo: "/images/logos/aws-logo.svg",
    url: "https://aws.amazon.com",
    nivel: "diamond",
  },
  {
    id: "universidad-demo",
    nombre: "Universidad Demo",
    logo: "/evento/patrocinadores/universidad-demo.svg",
    url: "https://example.com",
    nivel: "gold",
  },
];
