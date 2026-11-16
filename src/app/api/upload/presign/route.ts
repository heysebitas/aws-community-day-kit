import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { presignUpload, S3_PUBLIC_URL, s3Key } from "@/lib/s3";
import { extensionDe, validarSubida } from "@/lib/subidas";

const CARPETAS = ["speakers", "speakers/photos", "speakers/logos", "agenda", "sponsors", "emails"];

/** URL firmada para una subida desde el panel. */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(["admin", "organizer"]);

    const { contentType, size, folder = "speakers" } = (await request.json()) as Record<string, unknown>;

    const v = validarSubida(contentType, size, "documento");
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
    if (typeof folder !== "string" || !CARPETAS.includes(folder)) {
      return Response.json({ error: "Carpeta no permitida" }, { status: 400 });
    }

    const key = s3Key(`${folder}/${randomUUID()}.${extensionDe(v.tipo)}`);
    return Response.json({
      uploadUrl: await presignUpload(key, v.tipo, v.tamano),
      publicUrl: `${S3_PUBLIC_URL}/${key}`,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
