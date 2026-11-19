import { ruta } from "@/lib/api";
import { NextResponse } from "next/server";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { fuenteDisponible, gifDeLaVentana } from "./gif";

export const runtime = "nodejs";

/** El reloj animado que va dentro de los correos. */

export const GET = ruta(async (request: Request) => {
  // Muy holgado: Gmail y otros piden las imágenes desde pocas IP de su proxy, y la
  // CPU ya la acota la caché (un GIF por ventana), no este límite.
  const limite = rateLimit(`countdown:${getIp(request)}`, 1200, 60_000);
  if (!limite.ok) {
    return new NextResponse(null, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) },
    });
  }

  if (!fuenteDisponible()) {
    return NextResponse.json({ error: "Falta la fuente del contador" }, { status: 500 });
  }

  const gif = await gifDeLaVentana();
  return new NextResponse(new Uint8Array(gif), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=5",
    },
  });
}, { etiqueta: "countdown GET" });
