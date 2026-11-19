import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAnyAccess } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { ruta } from "@/lib/api";

export const GET = ruta(async (request: NextRequest) => {
  await requireAnyAccess(["checkin", "escaner_checkin", "escaner_salas", "escaner_almuerzos", "escaner_badges"], "ver", ["admin", "organizer", "volunteer"]);
  const shortId = request.nextUrl.searchParams.get("shortId");
  if (!shortId) return NextResponse.json({ code: "datos_invalidos", error: "shortId requerido" }, { status: 400 });

  await connectDB();
  const passport = await Passport.findOne({ shortId }).lean() as Record<string, unknown> | null;

  if (!passport) return NextResponse.json({ found: false }, { status: 404 });

  return NextResponse.json({
    found: true,
    shortId: passport.shortId,
    firstName: passport.firstName,
    lastName: passport.lastName,
    role: passport.role,
    sessionAttendance: passport.sessionAttendance ?? [],
    meals: passport.meals ?? {},
  });
});
