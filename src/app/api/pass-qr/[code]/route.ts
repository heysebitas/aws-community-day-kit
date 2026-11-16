import { NextRequest } from "next/server";
import QRCode from "qrcode";

// QR público (PNG) de un código, para mostrarlo inline en correos (sin auth, como /api/passes).
// Codifica el código tal cual — mismo contenido que el pase de registro.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    // Es un generador de QR abierto: se acota a lo que mide un código de pase.
    if (!code || code.length > 64) return Response.json({ error: "code inválido" }, { status: 400 });

    const png = await QRCode.toBuffer(code, {
      type: "png",
      width: 360,
      margin: 2,
      color: { dark: "#111827", light: "#FFFFFF" },
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
