import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { EmailCampana } from "@/models/email-campana";
import { EmailEnvio } from "@/models/email-envio";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Las campañas que se han mandado, con cómo les fue. */
export const GET = ruta(async () => {
  await requireAccess("correos", "ver", ["admin", "organizer"]);
  await connectDB();

  const campanas = await EmailCampana.find({}).sort({ createdAt: -1 }).limit(100).lean();
  if (!campanas.length) return Response.json({ campanas: [] });

  const ids = campanas.map((c) => c._id);
  const porEstado = await EmailEnvio.aggregate<{ _id: { campana: unknown; estado: string }; n: number }>([
    { $match: { campana: { $in: ids } } },
    { $group: { _id: { campana: "$campana", estado: "$estado" }, n: { $sum: 1 } } },
  ]);

  const mapa = new Map<string, Record<string, number>>();
  for (const fila of porEstado) {
    const clave = String(fila._id.campana);
    const actual = mapa.get(clave) ?? {};
    actual[fila._id.estado] = fila.n;
    mapa.set(clave, actual);
  }

  return Response.json({
    campanas: campanas.map((c) => ({
      id: String(c._id),
      plantilla: c.plantilla,
      nombrePlantilla: c.nombrePlantilla,
      asunto: c.asunto,
      resumenAudiencia: c.resumenAudiencia,
      evitarRepetidos: c.evitarRepetidos,
      estado: c.estado,
      total: c.total,
      enviados: c.enviados,
      fallidos: c.fallidos,
      lanzadaPor: c.lanzadaPor,
      error: c.error,
      createdAt: c.createdAt,
      /** Por estado de entrega. Las claves son las de `ESTADOS_ENVIO`. */
      entregas: mapa.get(String(c._id)) ?? {},
    })),
  });
});

/** Acá no se manda nada. */
export async function POST() {
  return Response.json({ error: "Para enviar, usa /api/admin/campanas/enviar" }, { status: 405 });
}
