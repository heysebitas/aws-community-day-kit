import { ruta, logError } from "@/lib/api";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { EVENTO } from "@/config";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { presignSubida, S3_PUBLIC_URL, s3Key } from "@/lib/s3";
import { extensionDe, validarSubida } from "@/lib/subidas";
import { verifyCaptcha } from "@/lib/captcha";
import { leerCuerpo } from "@/lib/cuerpo";

/** URL firmada para la foto de quien postula como speaker. */
export const POST = ruta(async (request: NextRequest) => {
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

    const { contentType, size, captchaToken } = await leerCuerpo(request);
    if (!(await verifyCaptcha(typeof captchaToken === "string" ? captchaToken : ""))) {
      return Response.json({ error: "Captcha inválido. Por favor intenta de nuevo." }, { status: 400 });
    }
    const v = validarSubida(contentType, size, "foto");
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

    const key = s3Key(`cfs/photos/${randomUUID()}.${extensionDe(v.tipo)}`);
    return Response.json({
      ...(await presignSubida(key, v.tipo, v.tamano)),
      publicUrl: `${S3_PUBLIC_URL}/${key}`,
    });
  } catch (e) {
    logError("upload/public-presign POST", e);
    return Response.json({ code: "subida_fallida", error: "Error al generar la URL de subida" }, { status: 500 });
  }
}, { etiqueta: "upload/public-presign POST" });
