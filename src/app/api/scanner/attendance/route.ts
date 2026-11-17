import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { createLog } from "@/lib/log";
import { leerCuerpo, textoDe, textoOpcional } from "@/lib/cuerpo";
import { ruta } from "@/lib/api";

export const POST = ruta(async (request: NextRequest) => {
  const user = await requireAccess("escaner_salas", "editar", ["admin", "organizer", "volunteer"]);
  const cuerpo = await leerCuerpo(request);
  // `shortId` y `sessionId` van al filtro de Mongo: tienen que ser texto.
  const shortId = textoDe(cuerpo, "shortId");
  const sessionId = textoDe(cuerpo, "sessionId");
  const sessionTitle = textoOpcional(cuerpo, "sessionTitle");
  const room = textoOpcional(cuerpo, "room");

  if (!shortId || !sessionId) {
    return NextResponse.json({ error: "shortId y sessionId requeridos" }, { status: 400 });
  }

  await connectDB();
  // El filtro exige que la sesión aún no esté anotada: solo un escaneo la agrega.
  const passport = await Passport.findOneAndUpdate(
    { shortId, "sessionAttendance.sessionId": { $ne: sessionId } },
    {
      $push: {
        sessionAttendance: {
          sessionId,
          sessionTitle,
          room,
          scannedAt: new Date(),
          scannedBy: user.name,
        },
      },
    },
    { returnDocument: "after" },
  );
  if (!passport) {
    const previo = await Passport.findOne({ shortId });
    if (!previo) return NextResponse.json({ found: false }, { status: 404 });
    const already = previo.sessionAttendance?.find(
      (e: { sessionId: string }) => e.sessionId === sessionId
    );
    return NextResponse.json({
      found: true,
      alreadyScanned: true,
      scannedAt: already?.scannedAt,
      firstName: previo.firstName,
      lastName: previo.lastName,
      role: previo.role,
    });
  }

  await createLog({
    userId: String(user._id),
    userName: user.name,
    userRole: user.role,
    action: "SESSION_ATTENDANCE",
    target: `${passport.firstName} ${passport.lastName}`.trim(),
    targetId: shortId,
    details: [sessionTitle, room].filter(Boolean).join(" · ") || sessionId,
  });

  return NextResponse.json({
    found: true,
    alreadyScanned: false,
    firstName: passport.firstName,
    lastName: passport.lastName,
    role: passport.role,
  });
});
