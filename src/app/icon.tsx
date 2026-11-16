import { ImageResponse } from "next/og";
import { Icono, fuentes } from "@/lib/marca";

export const runtime = "nodejs";
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<Icono lado={48} />, { ...size, fonts: fuentes() });
}
