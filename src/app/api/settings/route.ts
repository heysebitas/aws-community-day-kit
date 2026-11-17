import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Setting } from "@/models/setting";
import { revalidatePublic, SPEAKERS_TAG } from "@/lib/data/revalidate";
import { ruta } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";

export const dynamic = "force-dynamic";

// GET: fetch multiple keys at once ?keys=pdf_local,pdf_international
export const GET = ruta(async (req: NextRequest) => {
  await requireAuth(["admin", "organizer"]);
  await connectDB();
  const keys = req.nextUrl.searchParams.get("keys")?.split(",").filter(Boolean) ?? [];
  const docs = await Setting.find(keys.length ? { key: { $in: keys } } : {}).lean();
  const result: Record<string, string> = {};
  for (const d of docs) result[d.key] = d.value;
  return Response.json(result);
});

// PATCH: upsert a single setting { key, value }
export const PATCH = ruta(async (req: NextRequest) => {
  await requireAuth(["admin"]);
  await connectDB();
  const { key, value } = await leerCuerpo(req);
  if (!key) return Response.json({ error: "key requerido" }, { status: 400 });
  await Setting.findOneAndUpdate({ key }, { value }, { upsert: true });
  // El orden de speakers afecta el listado público cacheado
  if (key === "speaker_sort") revalidatePublic(SPEAKERS_TAG);
  return Response.json({ ok: true });
});
