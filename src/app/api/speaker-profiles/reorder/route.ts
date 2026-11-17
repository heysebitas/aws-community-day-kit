import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { revalidatePublic, SPEAKERS_TAG } from "@/lib/data/revalidate";
import { ruta } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";

export const dynamic = "force-dynamic";

export const POST = ruta(async (request: NextRequest) => {
  await requireAccess("speakers", "editar", ["admin", "organizer"]);
  await connectDB();

  const { orders } = await leerCuerpo(request);
  if (!Array.isArray(orders)) return Response.json({ error: "orders requerido" }, { status: 400 });
  const validos = orders.filter(
    (o): o is { id: string; sortOrder: number } =>
      !!o && typeof o.id === "string" && typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder),
  );
  if (validos.length !== orders.length) return Response.json({ error: "orders inválido" }, { status: 400 });

  await Promise.all(validos.map(({ id, sortOrder }) => SpeakerProfile.findByIdAndUpdate(id, { sortOrder })));

  revalidatePublic(SPEAKERS_TAG);

  return Response.json({ ok: true });
});
