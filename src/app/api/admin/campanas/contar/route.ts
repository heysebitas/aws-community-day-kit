import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { sanearAudiencia, resumenAudiencia } from "@/lib/audiencias";
import { contarAudiencia } from "@/lib/audiencias-servidor";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

/** A cuánta gente le llegaría esto. */
export const POST = ruta(async (request: NextRequest) => {
  await requireAccess("correos", "ver", ["admin", "organizer"]);

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const audiencia = sanearAudiencia(body.audiencia);
  if (!audiencia.length) {
    return Response.json({ total: 0, porSegmento: [], repetidos: 0, resumen: "sin audiencia" });
  }

  await connectDB();

  // Sin `campana` no se excluye a nadie: el conteo de un reenvío tiene que
  // contar a quien ya lo recibió, porque justamente va a volver a recibirlo.
  const campana = body.evitarRepetidos === false ? undefined : (body.plantilla as string | undefined);
  const conteo = await contarAudiencia(audiencia, { campana });

  return Response.json({ ...conteo, resumen: resumenAudiencia(audiencia) });
}, { etiqueta: "[campanas/contar]" });
