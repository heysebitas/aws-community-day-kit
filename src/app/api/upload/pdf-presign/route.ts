import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth";
import { presignSubida, S3_PUBLIC_URL, s3Key } from "@/lib/s3";
import { validarSubida } from "@/lib/subidas";
import { ruta } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";

/** URL firmada para los PDF que se adjuntan a los correos de speakers. */
export const POST = ruta(async (request: NextRequest) => {
  await requireAuth(["admin"]);

  const { key, size } = await leerCuerpo(request);
  if (key !== "pdf_local" && key !== "pdf_international") {
    return Response.json({ error: "key inválida" }, { status: 400 });
  }
  const v = validarSubida("application/pdf", size, "documento");
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  const archivo = s3Key(`pdfs/${key}-${randomUUID()}.pdf`);
  return Response.json({
    ...(await presignSubida(archivo, v.tipo, v.tamano)),
    publicUrl: `${S3_PUBLIC_URL}/${archivo}`,
  });
});
