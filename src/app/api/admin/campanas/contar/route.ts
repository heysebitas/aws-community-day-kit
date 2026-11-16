import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { sanearAudiencia, resumenAudiencia } from "@/lib/audiencias";
import { contarAudiencia } from "@/lib/audiencias-servidor";

export const dynamic = "force-dynamic";

/** A cuánta gente le llegaría esto. */
export async function POST(request: NextRequest) {
  try {
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
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    console.error("[campanas/contar]", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
