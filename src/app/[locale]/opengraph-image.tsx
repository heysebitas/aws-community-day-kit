import { ImageResponse } from "next/og";
import { EVENTO } from "@/config";
import { Banner, fuentes } from "@/lib/marca";

export const runtime = "nodejs";
export const alt = EVENTO.nombreCompleto;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** La imagen al compartir cualquier página del sitio. Los perfiles de speaker tienen la suya. */
export default function Image() {
  return new ImageResponse(<Banner />, { ...size, fonts: fuentes() });
}
