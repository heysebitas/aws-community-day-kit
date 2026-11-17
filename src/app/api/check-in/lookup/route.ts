import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAnyAccess } from "@/lib/auth";
import { Registration } from "@/models/registration";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = ruta(async (req: NextRequest) => {
  await requireAnyAccess(["checkin", "escaner_checkin"], "ver", ["admin", "organizer", "volunteer"]);

  const qr = req.nextUrl.searchParams.get("qr")?.trim();
  if (!qr) return NextResponse.json({ error: "QR requerido" }, { status: 400 });

  await connectDB();
  const registration = await Registration.findOne({ qrCode: qr })
    .select("firstName lastName")
    .lean();

  if (!registration) {
    return NextResponse.json({ found: false, error: "No encontrado" }, { status: 404 });
  }

  const firstName = registration.firstName;
  const lastName = registration.lastName;
  const registrationId = String(registration._id);

  return NextResponse.json({ found: true, firstName, lastName, registrationId });
});
