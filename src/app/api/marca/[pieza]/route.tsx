import { ruta } from "@/lib/api";
import { ImageResponse } from "next/og";
import { Banner, CabeceraCorreo, Icono, PieCorreo, fuentes } from "@/lib/marca";
import { CacheImagenes, respuestaPng } from "@/lib/cache-imagen";
import { getIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Salen de la configuración y el tema, que sólo cambian con un despliegue (un
// proceso nuevo): basta con dibujar cada pieza una vez. Son 7 combinaciones.
const cache = new CacheImagenes(16, 8 * 1024 * 1024);

// Se cachean un día y se sirven viejas mientras se regeneran.
const CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

function dibujo(pieza: string, lado: number): (() => ImageResponse) | null {
  const fonts = fuentes();
  switch (pieza) {
    case "banner":
      return () => new ImageResponse(<Banner />, { width: 1200, height: 630, fonts });
    case "correo-cabecera":
      return () => new ImageResponse(<CabeceraCorreo />, { width: 1192, height: 440, fonts });
    case "correo-pie":
      return () => new ImageResponse(<PieCorreo />, { width: 1192, height: 560, fonts });
    case "icono":
      return () => new ImageResponse(<Icono lado={lado} />, { width: lado, height: lado, fonts });
    default:
      return null;
  }
}

/**
 * Las imágenes de marca, generadas: `/api/marca/banner`, `/correo-cabecera`,
 * `/correo-pie` e `/icono?t=192`. Los dibujos están en `src/lib/marca.tsx`.
 */
export const GET = ruta(async (req: Request, { params }: { params: Promise<{ pieza: string }> }) => {
  const { pieza } = await params;
  const pedido = Number(new URL(req.url).searchParams.get("t"));
  const lado = pieza === "icono" && [48, 180, 192, 512].includes(pedido) ? pedido : 192;
  const clave = pieza === "icono" ? `icono:${lado}` : pieza;

  // Ya dibujada no cuesta nada: el límite sólo protege el dibujo. Los correos
  // abiertos llegan desde pocas IP (los proxies de imágenes del correo).
  const lista = cache.leer(clave);
  if (lista) return respuestaPng(await lista, CACHE_CONTROL);

  const limite = rateLimit(`imagen-marca:${getIp(req)}`, 300, 10 * 60 * 1000);
  if (!limite.ok) {
    return Response.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
    );
  }

  const dibujar = dibujo(pieza, lado);
  if (!dibujar) return new Response("No existe", { status: 404 });
  return respuestaPng(await cache.obtener(clave, dibujar), CACHE_CONTROL);
}, { etiqueta: "marca/[pieza] GET" });
