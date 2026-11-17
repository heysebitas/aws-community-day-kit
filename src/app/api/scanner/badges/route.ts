import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SponsorPin } from "@/models/sponsor-pin";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

// Badges (SponsorPin activos) que el usuario actual puede dar. Admin = todos.
export const GET = ruta(async () => {
  const user = await requireAccess("escaner_badges", "ver", ["admin", "organizer", "volunteer", "badges"]);

  await connectDB();
  const all = await SponsorPin.find({ isActive: true })
    .select("_id sponsorName logoUrl")
    .sort({ sponsorName: 1 })
    .lean<{ _id: unknown; sponsorName: string; logoUrl?: string }[]>();

  const list = all.map((s) => ({ id: String(s._id), sponsorName: s.sponsorName, logoUrl: s.logoUrl ?? "" }));
  if (user.role === "admin") return NextResponse.json({ badges: list });

  const allowed = new Set((user.allowedBadges ?? []).map(String));
  return NextResponse.json({ badges: list.filter((b) => allowed.has(b.id)) });
});
