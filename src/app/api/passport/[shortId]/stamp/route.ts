import { ruta, logError } from "@/lib/api";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { isBlocked, recordFail } from "@/lib/rate-limit";
import { Passport } from "@/models/passport";
import { SponsorPin } from "@/models/sponsor-pin";
import { leerCuerpo } from "@/lib/cuerpo";

const LIMITE = 8;
const VENTANA = 15 * 60 * 1000;

/**
 * Pone el sello de un stand en un pasaporte: el asistente escribe el PIN que
 * le dicta quien atiende. Los fallos se cuentan solo por pasaporte: en la sede
 * todos comparten una IP y un límite por IP bloquearía a todos.
 */
export const POST = ruta(async (req: NextRequest, { params }: { params: Promise<{ shortId: string }> }) => {
  try {
    const { shortId } = await params;
    const { pin } = await leerCuerpo(req);
    if (!pin || typeof pin !== "string") return Response.json({ error: "PIN requerido" }, { status: 400 });

    const clave = `sello:*:${shortId}`;
    const bloqueo = isBlocked(clave, LIMITE);
    if (bloqueo.blocked) {
      return Response.json(
        { error: `Demasiados intentos. Intenta en ${Math.ceil(bloqueo.retryAfterMs / 60000)} min.` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(bloqueo.retryAfterMs / 1000)) } },
      );
    }

    await connectDB();

    const sponsor = await SponsorPin.findOne({ pin: pin.trim().slice(0, 32), isActive: true });
    if (!sponsor) {
      recordFail(clave, LIMITE, VENTANA);
      return Response.json({ error: "PIN incorrecto o sponsor inactivo" }, { status: 400 });
    }

    // El filtro exige que el sello aún no esté: solo un escaneo lo agrega.
    const sponsorId = sponsor._id.toString();
    const sellado = await Passport.findOneAndUpdate(
      { shortId, "stamps.sponsorId": { $ne: sponsorId } },
      { $push: { stamps: { sponsorId, sponsorName: sponsor.sponsorName, stampedAt: new Date() } } },
      { returnDocument: "after" },
    );
    if (!sellado) {
      if (!(await Passport.exists({ shortId }))) {
        return Response.json({ error: "Pasaporte no encontrado" }, { status: 404 });
      }
      return Response.json({ error: "Ya tienes el sello de este sponsor" }, { status: 409 });
    }
    await SponsorPin.findByIdAndUpdate(sponsor._id, { $inc: { totalStamps: 1 } });

    return Response.json({ ok: true, sponsorName: sponsor.sponsorName });
  } catch (e) {
    logError("passport/[shortId]/stamp POST", e);
    return Response.json({ code: "error_interno", error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "passport/[shortId]/stamp POST" });
