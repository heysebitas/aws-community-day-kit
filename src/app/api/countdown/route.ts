import { NextResponse } from "next/server";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { fuenteDisponible, gifDeLaVentana } from "./gif";

export const runtime = "nodejs";

/** El reloj animado que va dentro de los correos. */

export async function GET(request: Request) {
  // Holgado: los clientes de correo piden desde pocas IP y el GIF va cacheado.
  const limite = rateLimit(`countdown:${getIp(request)}`, 120, 60_000);
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
}
