import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SpeakerProfile } from "@/models/speaker-profile";
import { getIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function toSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  const limite = rateLimit(`slug-speaker:${getIp(req)}`, 120, 15 * 60 * 1000);
  if (!limite.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
    );
  }

  const raw = req.nextUrl.searchParams.get("slug") ?? "";
  const slug = toSlug(raw);

  if (!slug || slug.length < 2) {
    return NextResponse.json({ available: false, slug, reason: "too_short" });
  }

  await connectDB();
  const exists = await SpeakerProfile.exists({ slug });

  return NextResponse.json({ available: !exists, slug });
}
