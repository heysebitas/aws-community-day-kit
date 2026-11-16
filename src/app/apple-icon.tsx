import { ImageResponse } from "next/og";
import { Icono, fuentes } from "@/lib/marca";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<Icono lado={180} />, { ...size, fonts: fuentes() });
}
