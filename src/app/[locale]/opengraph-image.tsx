import { ImageResponse } from "next/og";
import { EVENTO } from "@/config";
import { routing } from "@/i18n/routing";
import { Banner, fuentes } from "@/lib/marca";

export const runtime = "nodejs";
export const alt = EVENTO.nombreCompleto;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Una imagen por idioma, generada en el build.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** La imagen al compartir cualquier página del sitio. Los perfiles de speaker tienen la suya. */
export default function Image() {
  return new ImageResponse(<Banner />, { ...size, fonts: fuentes() });
}
