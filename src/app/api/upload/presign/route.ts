import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { presignSubida, S3_PUBLIC_URL, s3Key } from "@/lib/s3";
import { extensionDe, validarSubida } from "@/lib/subidas";
import { ruta } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";

const CARPETAS = ["speakers", "speakers/photos", "speakers/logos", "agenda", "sponsors", "emails"];

/** URL firmada para una subida desde el panel. */
export const POST = ruta(async (request: NextRequest) => {
  await requireAuth(["admin", "organizer"]);

  const { contentType, size, folder = "speakers" } = await leerCuerpo(request);

  const v = validarSubida(contentType, size, "documento");
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
  if (typeof folder !== "string" || !CARPETAS.includes(folder)) {
    return Response.json({ error: "Carpeta no permitida" }, { status: 400 });
  }

  const key = s3Key(`${folder}/${randomUUID()}.${extensionDe(v.tipo)}`);
  return Response.json({
    ...(await presignSubida(key, v.tipo, v.tamano)),
    publicUrl: `${S3_PUBLIC_URL}/${key}`,
  });
});
