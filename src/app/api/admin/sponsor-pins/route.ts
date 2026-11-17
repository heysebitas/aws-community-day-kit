import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { SponsorPin } from "@/models/sponsor-pin";
import { ruta } from "@/lib/api";

export const GET = ruta(async () => {
  await requireAuth(["admin"]);
  await connectDB();
  const pins = await SponsorPin.find({}).sort({ createdAt: -1 }).lean();
  return Response.json({ pins });
});

export const POST = ruta(async (req: NextRequest) => {
  await requireAuth(["admin"]);
  const { sponsorName, logoUrl, pin } = await req.json();

  if (!sponsorName?.trim() || !pin?.trim()) {
    return Response.json({ error: "Nombre y PIN son requeridos" }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin.trim())) {
    return Response.json({ error: "El PIN debe ser exactamente 4 dígitos" }, { status: 400 });
  }

  await connectDB();

  const existing = await SponsorPin.findOne({ pin: pin.trim() });
  if (existing) {
    return Response.json({ error: "PIN ya en uso por otro sponsor" }, { status: 409 });
  }

  const doc = await SponsorPin.create({
    sponsorName: sponsorName.trim(),
    logoUrl: logoUrl?.trim() || undefined,
    pin: pin.trim(),
  });
  return Response.json({ pin: doc }, { status: 201 });
});
