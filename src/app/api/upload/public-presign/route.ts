import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { EVENTO } from "@/config";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { presignSubida, S3_PUBLIC_URL, s3Key } from "@/lib/s3";
import { extensionDe, validarSubida } from "@/lib/subidas";
import { leerCuerpo } from "@/lib/cuerpo";

/** URL firmada para la foto de quien postula como speaker. */
export async function POST(request: NextRequest) {
  try {
    if (Date.now() > new Date(EVENTO.cfpCierre).getTime()) {
      return Response.json({ error: "La convocatoria está cerrada" }, { status: 403 });
    }

    const limite = rateLimit(`subida:${getIp(request)}`, 12, 10 * 60 * 1000);
    if (!limite.ok) {
      return Response.json(
        { error: "Demasiadas subidas. Intenta en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
      );
    }

    const { contentType, size } = await leerCuerpo(request);
    const v = validarSubida(contentType, size, "foto");
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

    const key = s3Key(`cfs/photos/${randomUUID()}.${extensionDe(v.tipo)}`);
    return Response.json({
      ...(await presignSubida(key, v.tipo, v.tamano)),
      publicUrl: `${S3_PUBLIC_URL}/${key}`,
    });
  } catch {
    return Response.json({ error: "Error al generar la URL de subida" }, { status: 500 });
  }
}
