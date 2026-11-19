import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { CacheImagenes, respuestaPng } from "@/lib/cache-imagen";

/** Los QR ya dibujados, por código; con tope porque el código lo elige quien pide. */
const cache = new CacheImagenes(200, 8 * 1024 * 1024);

// QR público (PNG) de un código, para mostrarlo inline en correos (sin auth, como /api/passes).
// Codifica el código tal cual — mismo contenido que el pase de registro.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const limite = rateLimit(`pass-qr:${getIp(req)}`, 120, 60_000);
  if (!limite.ok) {
    return Response.json(
      { error: "Demasiadas solicitudes" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
    );
  }
  try {
    const { code } = await params;
    // Es un generador de QR abierto: se acota a lo que mide un código de pase.
    if (!code || code.length > 64) return Response.json({ error: "code inválido" }, { status: 400 });

    const png = await cache.obtener(code, async () => {
      const buf = await QRCode.toBuffer(code, {
        type: "png",
        width: 360,
        margin: 2,
        color: { dark: "#111827", light: "#FFFFFF" },
      });
      return new Response(new Uint8Array(buf));
    });
    return respuestaPng(png, "public, max-age=86400");
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
