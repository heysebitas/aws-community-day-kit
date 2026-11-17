import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { render } from "@react-email/components";
import { EVENTO, SITIO } from "@/config";
import { connectDB } from "@/lib/db";
import { Passport, type IPassport } from "@/models/passport";
import { SponsorPin } from "@/models/sponsor-pin";
import { Registration } from "@/models/registration";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { SpeakerProfile } from "@/models/speaker-profile";
import { User } from "@/models/user";
import { PassportEditToken } from "@/models/passport-edit-token";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { PassportEditConfirmEmail } from "@/emails/passport-edit-confirm";
import { comprobarPin, nuevoPin } from "@/lib/pin";
import { esDelBucket } from "@/lib/subidas";
import { maskEmail } from "@/lib/utils";
import { leerCuerpo } from "@/lib/cuerpo";

/** El pasaporte digital. */

const SOCIAL_KEYS = ["builderCenter", "linkedin", "instagram", "x", "github", "tiktok"] as const;
const FIELD_LABELS: Record<string, string> = {
  builderCenter: "Builder Center", linkedin: "LinkedIn", instagram: "Instagram",
  x: "X / Twitter", github: "GitHub", tiktok: "TikTok", photo: "Foto",
};

const sanitizeUser = (v: unknown) =>
  typeof v === "string" ? v.trim().replace(/^@+/, "").replace(/\s+/g, "").slice(0, 80) : "";

/** Lo único que sale al público. El resto del documento es operación interna. */
function publico(p: IPassport) {
  const clicks = p.stats?.clicks;
  return {
    shortId: p.shortId,
    role: p.role,
    firstName: p.firstName,
    lastName: p.lastName,
    company: p.company ?? "",
    jobTitle: p.jobTitle ?? "",
    photoUrl: p.photoUrl ?? "",
    social: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, p.social?.[k] ?? ""])),
    stats: {
      views: p.stats?.views ?? 0,
      clicks: clicks instanceof Map ? Object.fromEntries(clicks) : (clicks ?? {}),
    },
    stamps: (p.stamps ?? []).map((s) => ({ sponsorId: s.sponsorId, sponsorName: s.sponsorName, stampedAt: s.stampedAt })),
  };
}

/** A quién avisarle de un cambio: el correo de la persona detrás del pasaporte. */
async function resolveOwnerContact(role: string, linkedId?: string): Promise<{ email: string; name: string }> {
  if (!linkedId) return { email: "", name: "" };
  try {
    if (role === "attendee") {
      const reg = await Registration.findById(linkedId).select("firstName lastName email").lean();
      return reg ? { email: reg.email, name: `${reg.firstName} ${reg.lastName}`.trim() } : { email: "", name: "" };
    }
    if (role === "volunteer") {
      const vol = await VolunteerSubmission.findById(linkedId).select("firstName lastName email").lean();
      return vol ? { email: vol.email, name: `${vol.firstName} ${vol.lastName}`.trim() } : { email: "", name: "" };
    }
    if (role === "speaker") {
      const sp = await SpeakerProfile.findById(linkedId).select("name email").lean();
      return { email: sp?.email ?? "", name: sp?.name || "" };
    }
    if (role === "organizer") {
      const u = await User.findById(linkedId).select("email name").lean<{ email?: string; name?: string } | null>();
      return { email: (u?.email || "").trim(), name: u?.name || "" };
    }
  } catch {
    /* sin correo */
  }
  return { email: "", name: "" };
}

const demasiados = (ms: number) => `Demasiados intentos. Intenta en ${Math.max(1, Math.ceil(ms / 60000))} min.`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ shortId: string }> }) {
  try {
    const { shortId } = await params;
    const pin = req.nextUrl.searchParams.get("pin");

    await connectDB();
    const passport = await Passport.findOne({ shortId });
    if (!passport) return Response.json({ error: "Pasaporte no encontrado" }, { status: 404 });

    if (!passport.viewPin) {
      passport.viewPin = nuevoPin();
      await passport.save();
    }

    const sponsors = await SponsorPin.find({ isActive: true }).select("_id sponsorName logoUrl").lean();
    const datos = { passport: publico(passport), sponsors, isOwner: false };

    if (!pin) return Response.json(datos);

    const intento = comprobarPin(req, "pasaporte", shortId, pin, passport.viewPin);
    if (intento.ok) return Response.json({ ...datos, isOwner: true });

    if (intento.bloqueado) {
      return Response.json(
        { ...datos, rateLimited: true, retryAfterMs: intento.retryAfterMs, pinError: demasiados(intento.retryAfterMs), error: demasiados(intento.retryAfterMs) },
        { status: 429, headers: { "Retry-After": String(Math.ceil(intento.retryAfterMs / 1000)) } },
      );
    }
    return Response.json({ ...datos, pinError: "PIN incorrecto." }, { status: 401 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ shortId: string }> }) {
  try {
    const { shortId } = await params;
    const body = await leerCuerpo(req);
    const { pin, photoUrl } = body;
    const social = body.social as Record<string, unknown> | undefined;

    await connectDB();
    const passport = await Passport.findOne({ shortId }).select("viewPin photoUrl social linkedRegistrationId firstName role");
    if (!passport) return Response.json({ error: "No encontrado" }, { status: 404 });

    const intento = comprobarPin(req, "pasaporte", shortId, pin, passport.viewPin);
    if (!intento.ok) {
      return intento.bloqueado
        ? Response.json({ error: demasiados(intento.retryAfterMs) }, { status: 429 })
        : Response.json({ error: "PIN incorrecto" }, { status: 401 });
    }

    // Añadir algo donde no había nada se aplica ya. Cambiar o borrar lo que
    // había queda pendiente de confirmación por correo.
    const current = (passport.social ?? {}) as Record<string, string>;
    const addSocial: Record<string, string> = {};
    const editSocial: Record<string, string> = {};
    const editList: { label: string; value: string }[] = [];

    if (social && typeof social === "object") {
      for (const key of SOCIAL_KEYS) {
        if (!(key in social)) continue;
        const next = sanitizeUser(social[key]);
        const cur = (current[key] ?? "").trim();
        if (next === cur) continue;
        if (cur === "" && next !== "") addSocial[key] = next;
        else {
          editSocial[key] = next;
          editList.push({ label: FIELD_LABELS[key], value: next || "(eliminar)" });
        }
      }
    }

    let addPhoto: string | undefined;
    let editPhoto: string | undefined;
    if (typeof photoUrl === "string") {
      const next = photoUrl.trim();
      // La foto sólo puede ser una subida al bucket: una URL ajena la cargaría
      // el navegador de cualquiera que abra el pasaporte.
      if (next && !esDelBucket(next)) return Response.json({ error: "Foto no válida" }, { status: 400 });
      const cur = (passport.photoUrl ?? "").trim();
      if (next !== cur) {
        if (cur === "" && next !== "") addPhoto = next;
        else {
          editPhoto = next;
          editList.push({ label: "Foto", value: next ? "actualizada" : "(eliminar)" });
        }
      }
    }

    const applied: string[] = [];

    if (Object.keys(addSocial).length > 0 || addPhoto !== undefined) {
      passport.social = { ...current, ...addSocial };
      passport.markModified("social");
      if (addPhoto !== undefined) passport.photoUrl = addPhoto;
      await passport.save();
      applied.push(...Object.keys(addSocial).map((k) => FIELD_LABELS[k]));
      if (addPhoto !== undefined) applied.push("Foto");
    }

    const hasEdits = Object.keys(editSocial).length > 0 || editPhoto !== undefined;
    if (!hasEdits) return Response.json({ ok: true, applied, pending: [] });

    const contact = await resolveOwnerContact(passport.role, passport.linkedRegistrationId);
    const email = contact.email;
    const name = passport.firstName || contact.name || "";

    // Sin correo al que pedir confirmación (un pasaporte hecho a mano), se aplica directo.
    if (!email) {
      passport.social = { ...(passport.social ?? {}), ...editSocial };
      passport.markModified("social");
      if (editPhoto !== undefined) passport.photoUrl = editPhoto;
      await passport.save();
      return Response.json({ ok: true, applied: [...applied, ...editList.map((e) => e.label)], pending: [], unverified: true });
    }

    // Un solo enlace vivo por pasaporte: lo pendiente de antes se junta con lo
    // nuevo y los enlaces viejos dejan de servir.
    const prior = await PassportEditToken.find({ shortId, usedAt: null })
      .select("changes")
      .lean<{ changes?: { social?: Record<string, string>; photoUrl?: string } }[]>();
    const mergedSocial: Record<string, string> = {};
    let mergedPhoto: string | undefined;
    for (const p of prior) {
      if (p.changes?.social) Object.assign(mergedSocial, p.changes.social);
      if (typeof p.changes?.photoUrl === "string") mergedPhoto = p.changes.photoUrl;
    }
    Object.assign(mergedSocial, editSocial);
    if (editPhoto !== undefined) mergedPhoto = editPhoto;

    await PassportEditToken.deleteMany({ shortId, usedAt: null });

    const changes: { social?: Record<string, string>; photoUrl?: string } = {};
    if (Object.keys(mergedSocial).length > 0) changes.social = mergedSocial;
    if (mergedPhoto !== undefined) changes.photoUrl = mergedPhoto;

    const token = nanoid(32);
    await PassportEditToken.create({ shortId, token, changes, expiresAt: new Date(Date.now() + 24 * 3600 * 1000) });

    const fullList: { label: string; value: string }[] = [
      ...SOCIAL_KEYS.filter((k) => k in mergedSocial).map((k) => ({ label: FIELD_LABELS[k], value: mergedSocial[k] || "(eliminar)" })),
      ...(mergedPhoto !== undefined ? [{ label: "Foto", value: mergedPhoto ? "actualizada" : "(eliminar)" }] : []),
    ];

    try {
      const html = await render(PassportEditConfirmEmail({ name, confirmUrl: `${SITIO}/confirmar-cambios/${token}`, changes: fullList }));
      await sendEmail({ from: EMAIL_FROM, to: email, subject: `Confirma los cambios en tu pasaporte — ${EVENTO.nombreCompleto}`, html });
    } catch {
      /* el correo no es fatal */
    }

    return Response.json({ ok: true, applied, pending: fullList.map((e) => e.label), maskedEmail: maskEmail(email) });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
