import { ImageResponse } from "next/og";
import { Banner, CabeceraCorreo, Icono, PieCorreo, fuentes } from "@/lib/marca";
import { getIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Las imágenes de marca, generadas: `/api/marca/banner`, `/correo-cabecera`,
 * `/correo-pie` e `/icono?t=192`. Los dibujos están en `src/lib/marca.tsx`.
 */
export async function GET(req: Request, { params }: { params: Promise<{ pieza: string }> }) {
  const limite = rateLimit(`imagen-marca:${getIp(req)}`, 300, 10 * 60 * 1000);
  if (!limite.ok) {
    return Response.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
    );
  }

  const { pieza } = await params;
  // Cambian sólo con un despliegue: se cachean un día y se sirven viejas mientras se regeneran.
  const headers = { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" };
  const opciones = { fonts: fuentes(), headers };

  switch (pieza) {
    case "banner":
      return new ImageResponse(<Banner />, { width: 1200, height: 630, ...opciones });
    case "correo-cabecera":
      return new ImageResponse(<CabeceraCorreo />, { width: 1192, height: 440, ...opciones });
    case "correo-pie":
      return new ImageResponse(<PieCorreo />, { width: 1192, height: 560, ...opciones });
    case "icono": {
      const pedido = Number(new URL(req.url).searchParams.get("t"));
      const lado = [48, 180, 192, 512].includes(pedido) ? pedido : 192;
      return new ImageResponse(<Icono lado={lado} />, { width: lado, height: lado, ...opciones });
    }
    default:
      return new Response("No existe", { status: 404 });
  }
}
