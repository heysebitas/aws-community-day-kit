import type { MetadataRoute } from "next";
import { EVENTO, IDIOMAS, SITIO } from "@/config";
import { localePath } from "@/lib/utils";

export const dynamic = "force-static";

/** Lo que no es contenido público: el panel, la API y las pantallas personales con token. */
const PRIVADO = ["/admin/", "/pasaporte/", "/confirmar/", "/confirmar-cambios/", "/creditos"];

/** Rastreadores de asistentes y buscadores de IA. Se les abre o se les cierra con `rastreoIA`. */
const ROBOTS_IA = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Amazonbot",
  "CCBot", "Bytespider", "meta-externalagent", "DuckAssistBot", "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/_next/", ...IDIOMAS.flatMap((i) => PRIVADO.map((p) => localePath(i, p)))];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      EVENTO.rastreoIA
        ? { userAgent: ROBOTS_IA, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow }
        : { userAgent: ROBOTS_IA, disallow: "/" },
    ],
    sitemap: `${SITIO}/sitemap.xml`,
    host: SITIO,
  };
}
