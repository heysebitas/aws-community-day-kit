import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Passport } from "@/models/passport";
import { rateLimit, getIp } from "@/lib/rate-limit";

const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;

/** Las redes que se pueden contar. Va con lista porque el nombre acaba siendo una clave del documento. */
const REDES = ["builderCenter", "linkedin", "instagram", "x", "github", "tiktok"];

/** Cuenta las visitas a un pasaporte y los clics en sus redes. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ shortId: string }> }) {
  try {
    const { shortId } = await params;
    const { event, platform } = (await req.json()) as { event?: unknown; platform?: unknown };
    const ip = getIp(req);

    if (event === "view") {
      if (!rateLimit(`stats:view:${ip}:${shortId}`, 50, DIA).ok) return Response.json({ ok: false, reason: "already_counted" });
      await connectDB();
      await Passport.updateOne({ shortId }, { $inc: { "stats.views": 1 } });
      return Response.json({ ok: true });
    }

    if (event === "click" && typeof platform === "string" && REDES.includes(platform)) {
      if (!rateLimit(`stats:click:${ip}:${shortId}:${platform}`, 50, HORA).ok) return Response.json({ ok: false, reason: "already_counted" });
      await connectDB();
      await Passport.updateOne({ shortId }, { $inc: { [`stats.clicks.${platform}`]: 1 } });
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false }, { status: 400 });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
