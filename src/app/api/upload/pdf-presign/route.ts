import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { presignUpload, S3_PUBLIC_URL, s3Key } from "@/lib/s3";
import { validarSubida } from "@/lib/subidas";

/** URL firmada para los PDF que se adjuntan a los correos de speakers. */
export async function POST(request: NextRequest) {
  try {
    await requireAuth(["admin"]);

    const { key, size } = (await request.json()) as Record<string, unknown>;
    if (key !== "pdf_local" && key !== "pdf_international") {
      return Response.json({ error: "key inválida" }, { status: 400 });
    }
    const v = validarSubida("application/pdf", size, "documento");
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

    const archivo = s3Key(`pdfs/${key}-${randomUUID()}.pdf`);
    return Response.json({
      uploadUrl: await presignUpload(archivo, v.tipo, v.tamano),
      publicUrl: `${S3_PUBLIC_URL}/${archivo}`,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
