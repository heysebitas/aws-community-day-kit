import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { createLog } from "@/lib/log";
import { leerCuerpo, textoDe } from "@/lib/cuerpo";
import { ruta } from "@/lib/api";

export const POST = ruta(async (request: NextRequest) => {
  const user = await requireAccess("escaner_almuerzos", "editar", ["admin", "organizer", "volunteer"]);
  const cuerpo = await leerCuerpo(request);
  // `shortId` va al filtro de Mongo: tiene que ser texto.
  const shortId = textoDe(cuerpo, "shortId");
  const type = textoDe(cuerpo, "type");

  if (!shortId || !type || !["lunch", "snack"].includes(type)) {
    return NextResponse.json({ error: "shortId y type ('lunch'|'snack') requeridos" }, { status: 400 });
  }

  await connectDB();
  // Solo cambia si aún no se reclamó: dos escaneos a la vez no entregan dos veces.
  const passport = await Passport.findOneAndUpdate(
    { shortId, [`meals.${type}.claimedAt`]: null },
    { $set: { [`meals.${type}`]: { claimedAt: new Date(), claimedBy: user.name } } },
    { returnDocument: "after" },
  );
  if (!passport) {
    const previo = await Passport.findOne({ shortId });
    if (!previo) return NextResponse.json({ found: false }, { status: 404 });
    const existing = (previo.meals ?? {}) as Record<string, { claimedAt?: Date; claimedBy?: string } | undefined>;
    return NextResponse.json({
      found: true,
      alreadyClaimed: true,
      claimedAt: existing[type]?.claimedAt,
      claimedBy: existing[type]?.claimedBy,
      firstName: previo.firstName,
      lastName: previo.lastName,
      role: previo.role,
    });
  }

  await createLog({
    userId: String(user._id),
    userName: user.name,
    userRole: user.role,
    action: "MEAL_CLAIMED",
    target: `${passport.firstName} ${passport.lastName}`.trim(),
    targetId: shortId,
    details: type === "lunch" ? "Almuerzo" : "Refrigerio",
  });

  return NextResponse.json({
    found: true,
    alreadyClaimed: false,
    firstName: passport.firstName,
    lastName: passport.lastName,
    role: passport.role,
  });
});
