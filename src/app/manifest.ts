import type { MetadataRoute } from "next";
import { EVENTO, TEMA } from "@/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: EVENTO.nombreCompleto,
    short_name: EVENTO.nombreCorto,
    description: `${EVENTO.ciudad} · ${EVENTO.organiza}`,
    id: "/",
    scope: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: TEMA.acento,
    icons: [
      { src: "/api/marca/icono?t=192", sizes: "192x192", type: "image/png" },
      { src: "/api/marca/icono?t=512", sizes: "512x512", type: "image/png" },
    ],
  };
}
