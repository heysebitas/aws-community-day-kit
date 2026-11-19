import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { SponsorPin } from "@/models/sponsor-pin";
import { createLog } from "@/lib/log";
import { leerCuerpo, textoDe } from "@/lib/cuerpo";
import { ruta } from "@/lib/api";

// Da un badge (sello) al pasaporte escaneado. Admin da cualquiera; el resto solo
// los badges que tenga en allowedBadges.
export const POST = ruta(async (request: NextRequest) => {
  const user = await requireAccess("escaner_badges", "editar", ["admin", "organizer", "volunteer", "badges"]);

  const cuerpo = await leerCuerpo(request);
  // `shortId` va al filtro de Mongo: tiene que ser texto.
  const shortId = textoDe(cuerpo, "shortId");
  const sponsorId = textoDe(cuerpo, "sponsorId");
  if (!shortId || !sponsorId) {
    return NextResponse.json({ code: "datos_invalidos", error: "shortId y sponsorId requeridos" }, { status: 400 });
  }

  // Permiso por usuario (admin no se restringe)
  if (user.role !== "admin") {
    const allowed = new Set((user.allowedBadges ?? []).map(String));
    if (!allowed.has(String(sponsorId))) {
      return NextResponse.json({ code: "sin_permiso", error: "No tienes permiso para dar este badge" }, { status: 403 });
    }
  }

  await connectDB();

  const sponsor = await SponsorPin.findById(sponsorId);
  if (!sponsor || !sponsor.isActive) {
    return NextResponse.json({ found: false, code: "badge_invalido", error: "Badge inválido o inactivo" }, { status: 404 });
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
});
