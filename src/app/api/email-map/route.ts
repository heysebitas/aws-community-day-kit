import { NextResponse } from "next/server";
import { EVENTO, TEMA } from "@/config";

export const runtime = "nodejs";

/** Mapa del venue para los correos. */

/** Centro por defecto: el venue, con las coordenadas ya verificadas. */
const { lat, lon } = EVENTO.coordenadas;
const DEFAULT_CENTER = `${lat},${lon}`;

/** El estilo del mapa, con los colores de los correos para que no se note pegado. */
const STYLE = [
  "feature:all|element:geometry|color:0x000000",
  "feature:all|element:labels.text.fill|color:0x9A9AAE",
  "feature:all|element:labels.text.stroke|color:0x000000",
  "feature:road|element:geometry|color:0x2A2A38",
  "feature:poi|element:labels|visibility:off",
];

/** Encaja `n` en [min,max]; si no es un número devuelve `fallback`. */
function clamp(raw: string | null, fallback: number, min: number, max: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function GET(request: Request) {
  const key = process.env.GOOGLE_MAPS_KEY;
  // Sin llave el correo se ve bien igual, sólo sin mapa.
  if (!key) return new NextResponse(null, { status: 503 });

  const params = new URL(request.url).searchParams;

  // scale=2 duplica los píxeles reales, así que el techo de Google (640) se
  // aplica sobre estas medidas, no sobre las finales.
  const w = clamp(params.get("w"), 520, 200, 640);
  const h = clamp(params.get("h"), 220, 100, 400);

  // `q` permite otra sede (p. ej. la del montaje) sin tocar el código. Va
  // limitado en largo; el resto de la petición no es negociable.
  const q = params.get("q")?.slice(0, 160);
  const center = q ? encodeURIComponent(q) : DEFAULT_CENTER;

  const url =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${center}` +
    `&zoom=15` +
    `&size=${w}x${h}` +
    `&scale=2` +
    `&maptype=roadmap` +
    `&markers=${encodeURIComponent(`color:0x${TEMA.acento.slice(1)}|${q || DEFAULT_CENTER}`)}` +
    STYLE.map((s) => `&style=${encodeURIComponent(s)}`).join("") +
    `&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) return new NextResponse(null, { status: 502 });

  return new NextResponse(await res.arrayBuffer(), {
    headers: {
      "Content-Type": "image/png",
      // El mapa de un evento con fecha fija no cambia. Que Gmail y compañía lo
      // cacheen es lo que evita una llamada a Google por cada apertura.
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
