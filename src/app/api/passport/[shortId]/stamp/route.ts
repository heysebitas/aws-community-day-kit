import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { getIp, isBlocked, recordFail } from "@/lib/rate-limit";
import { Passport } from "@/models/passport";
import { SponsorPin } from "@/models/sponsor-pin";

const LIMITE = 8;
const VENTANA = 15 * 60 * 1000;

/**
 * Pone el sello de un stand en un pasaporte: el asistente escribe el PIN que
 * le dicta quien atiende. Los fallos se cuentan por pasaporte y por IP, para
 * que nadie se selle la cartilla entera probando números.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ shortId: string }> }) {
  try {
    const { shortId } = await params;
    const { pin } = (await req.json()) as { pin?: unknown };
    if (!pin || typeof pin !== "string") return Response.json({ error: "PIN requerido" }, { status: 400 });

    const claves = [`sello:${getIp(req)}`, `sello:*:${shortId}`];
    const bloqueo = claves.map((c) => isBlocked(c, LIMITE)).find((b) => b.blocked);
    if (bloqueo) {
      return Response.json(
        { error: `Demasiados intentos. Intenta en ${Math.ceil(bloqueo.retryAfterMs / 60000)} min.` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(bloqueo.retryAfterMs / 1000)) } },
      );
    }

    await connectDB();

    const sponsor = await SponsorPin.findOne({ pin: pin.trim().slice(0, 32), isActive: true });
    if (!sponsor) {
      claves.forEach((c) => recordFail(c, LIMITE, VENTANA));
      return Response.json({ error: "PIN incorrecto o sponsor inactivo" }, { status: 400 });
    }

    const passport = await Passport.findOne({ shortId });
    if (!passport) return Response.json({ error: "Pasaporte no encontrado" }, { status: 404 });

    const sponsorId = sponsor._id.toString();
    if (passport.stamps.some((s: { sponsorId: string }) => s.sponsorId === sponsorId)) {
      return Response.json({ error: "Ya tienes el sello de este sponsor" }, { status: 409 });
    }

    passport.stamps.push({ sponsorId, sponsorName: sponsor.sponsorName, stampedAt: new Date() });
    await passport.save();
    await SponsorPin.findByIdAndUpdate(sponsor._id, { $inc: { totalStamps: 1 } });

    return Response.json({ ok: true, sponsorName: sponsor.sponsorName });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
