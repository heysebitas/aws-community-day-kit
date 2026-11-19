import { ruta, logError } from "@/lib/api";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/registration";
import { Passport } from "@/models/passport";
import { badgeNameOptions, maskEmail } from "@/lib/utils";
import { createLog } from "@/lib/log";
import { EVENTO } from "@/config";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { enlacesViejosVigentes } from "@/lib/identidad";

/**
 * El enlace lleva `tokenConfirmacion`. Los que se mandaron antes del cambio
 * llevan el `qrCode` y valen hasta que acaba el evento. El `shortId` del
 * pasaporte no abre nada aquí.
 */
async function registroDelEnlace(token: string) {
  const nuevo = await Registration.findOne({ tokenConfirmacion: token });
  if (nuevo) return nuevo;
  return enlacesViejosVigentes() ? Registration.findOne({ qrCode: token }) : null;
}

function isExpired(): boolean {
  return Date.now() > new Date(EVENTO.confirmacionHasta).getTime();
}

export const GET = ruta(async (
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) => {
  try {
    const limite = rateLimit(`confirmacion:${getIp(_req)}`, 100, 15 * 60 * 1000);
    if (!limite.ok) {
      return Response.json(
        { code: "demasiados_intentos", error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
      );
    }

    const { token } = await params;
    await connectDB();

    const reg = await registroDelEnlace(token);
    if (!reg) return Response.json({ found: false }, { status: 404 });

    const { options } = badgeNameOptions(reg.firstName, reg.lastName);

    // Los campos normalizados salen del pasaporte ligado al registro
    const passport = await Passport.findOne({ linkedRegistrationId: String(reg._id) })
      .select("firstName lastName company jobTitle role")
      .lean() as Record<string, unknown> | null;

    const confirmation = (reg.confirmation as {
      confirmed?: boolean; confirmedAt?: Date | null; badgeFirstName?: string; badgeLastName?: string;
    } | undefined) ?? {};

    const status: "confirmed" | "expired" | "pending" =
      confirmation.confirmed ? "confirmed" : isExpired() ? "expired" : "pending";

    return Response.json({
      found: true,
      firstName: (passport?.firstName as string) ?? "",
      lastName: (passport?.lastName as string) ?? "",
      company: (passport?.company as string) ?? "",
      jobTitle: (passport?.jobTitle as string) ?? "",
      role: (passport?.role as string) ?? "attendee",
      email: maskEmail(reg.email),
      nameOptions: options,
      status,
      badgeFirstName: confirmation.badgeFirstName ?? "",
      badgeLastName: confirmation.badgeLastName ?? "",
      confirmedAt: confirmation.confirmedAt ?? null,
      deadline: EVENTO.confirmacionHasta,
    });
  } catch (e) {
    logError("confirm/[token] GET", e);
    return Response.json({ code: "error_interno", error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "confirm/[token] GET" });

export const POST = ruta(async (
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) => {
  try {
    const limite = rateLimit(`confirmacion:${getIp(req)}`, 100, 15 * 60 * 1000);
    if (!limite.ok) {
      return Response.json(
        { code: "demasiados_intentos", error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
      );
    }

    const { token } = await params;
    const body = await req.json().catch(() => ({})) as { badgeFirstName?: string; badgeLastName?: string };

    await connectDB();
    const reg = await registroDelEnlace(token);
    if (!reg) return Response.json({ code: "no_encontrado", error: "No encontrado" }, { status: 404 });

    if (reg.confirmation?.confirmed) {
      return Response.json({ code: "ya_confirmado", error: "Ya confirmaste tu asistencia" }, { status: 409 });
    }
    if (isExpired()) {
      return Response.json({ code: "confirmacion_cerrada", error: "El periodo de confirmación terminó" }, { status: 410 });
    }

    const { firsts, lasts } = badgeNameOptions(reg.firstName, reg.lastName);

    const badgeFirstName = (body.badgeFirstName ?? "").trim().toUpperCase();
    const badgeLastName = (body.badgeLastName ?? "").trim().toUpperCase();

    if (!firsts.includes(badgeFirstName) || !lasts.includes(badgeLastName)) {
      return Response.json({ code: "seleccion_invalida", error: "Selección de nombre inválida" }, { status: 400 });
    }

    const now = new Date();
    reg.confirmation = { confirmed: true, confirmedAt: now, badgeFirstName, badgeLastName };
    await reg.save();

    // Mirror to the passport so printing is trivial
    await Passport.updateOne(
      { linkedRegistrationId: String(reg._id) },
      { $set: { confirmed: true, confirmedAt: now, badgeFirstName, badgeLastName } },
    );

    const fullName = `${reg.firstName} ${reg.lastName}`.trim() || `${badgeFirstName} ${badgeLastName}`;
    await createLog({
      userId: String(reg._id),
      userName: fullName,
      userRole: "attendee",
      action: "ATTENDANCE_CONFIRMED",
      target: fullName,
      targetId: String(reg._id),
      details: `Escarapela: ${badgeFirstName} ${badgeLastName}`,
    });

    return Response.json({ ok: true, badgeFirstName, badgeLastName });
  } catch (e) {
    logError("confirm/[token] POST", e);
    return Response.json({ code: "error_interno", error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "confirm/[token] POST" });
