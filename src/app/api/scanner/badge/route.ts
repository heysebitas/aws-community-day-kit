import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { SponsorPin } from "@/models/sponsor-pin";
import { createLog } from "@/lib/log";

// Da un badge (sello) al pasaporte escaneado. Admin da cualquiera; el resto solo
// los badges que tenga en allowedBadges.
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAccess("escaner_badges", "editar", ["admin", "organizer", "volunteer", "badges"]);
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }

  try {
    const { shortId, sponsorId } = await request.json() as { shortId?: string; sponsorId?: string };
    if (!shortId || !sponsorId) {
      return NextResponse.json({ error: "shortId y sponsorId requeridos" }, { status: 400 });
    }

    // Permiso por usuario (admin no se restringe)
    if (user.role !== "admin") {
      const allowed = new Set((user.allowedBadges ?? []).map(String));
      if (!allowed.has(String(sponsorId))) {
        return NextResponse.json({ error: "No tienes permiso para dar este badge" }, { status: 403 });
      }
    }

    await connectDB();

    const sponsor = await SponsorPin.findById(sponsorId);
    if (!sponsor || !sponsor.isActive) {
      return NextResponse.json({ found: false, error: "Badge inválido o inactivo" }, { status: 404 });
    }

    // El filtro exige que el sello aún no esté: solo un escaneo lo agrega.
    const sid = String(sponsor._id);
    const passport = await Passport.findOneAndUpdate(
      { shortId, "stamps.sponsorId": { $ne: sid } },
      { $push: { stamps: { sponsorId: sid, sponsorName: sponsor.sponsorName, stampedAt: new Date() } } },
      { returnDocument: "after" },
    );
    if (!passport) {
      const previo = await Passport.findOne({ shortId });
      if (!previo) return NextResponse.json({ found: false }, { status: 404 });
      return NextResponse.json({
        found: true, alreadyHas: true,
        firstName: previo.firstName, lastName: previo.lastName, role: previo.role,
        sponsorName: sponsor.sponsorName,
      });
    }
    await SponsorPin.findByIdAndUpdate(sponsor._id, { $inc: { totalStamps: 1 } });

    await createLog({
      userId: String(user._id), userName: user.name, userRole: user.role,
      action: "BADGE_GIVEN",
      target: `${passport.firstName} ${passport.lastName}`.trim(),
      targetId: shortId,
      details: sponsor.sponsorName,
    });

    return NextResponse.json({
      found: true, alreadyHas: false,
      firstName: passport.firstName, lastName: passport.lastName, role: passport.role,
      sponsorName: sponsor.sponsorName,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
