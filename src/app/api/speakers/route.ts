import { NextRequest } from "next/server";
import { esTrack } from "@/data/session-tracks";
import { cleanWhitespace, cleanMultiline, normalizeEmail, normalizeLink, sinEmoji, toName } from "@/lib/normalize";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { esDelBucket } from "@/lib/subidas";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { Setting } from "@/models/setting";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { CopiaDeLaPropuesta } from "@/emails/speaker-submission-confirmation";
import { armarCorreo } from "@/lib/email-plantillas";
import { SpeakerProfile, isProfileStatus } from "@/models/speaker-profile";
import { EVENTO } from "@/config";

export const dynamic = "force-dynamic";

// ── Slug helpers ──────────────────────────────────────────────────────────────
function toSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function buildSlugFromNames(firstName: string, lastName: string, coSpeakers: { firstName: string; lastName: string }[]): string {
  const mainSlug = toSlug(`${firstName} ${lastName}`);
  const coSlugs = coSpeakers
    .filter((cs) => cs.firstName || cs.lastName)
    .map((cs) => toSlug(`${cs.firstName} ${cs.lastName}`))
    .filter(Boolean);
  const all = [mainSlug, ...coSlugs];
  if (all.length === 1) return all[0];
  const last = all[all.length - 1];
  return all.slice(0, -1).join("-") + "-y-" + last;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (await SpeakerProfile.exists({ slug })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

// ── Static form validation ────────────────────────────────────────────────────
// Mientras EVENTO.cfp.online esté apagado, «online» no es un valor válido:
// se cae en «Campos requeridos: sessionType», igual que si no hubieran elegido.
const SESSION_TYPES = EVENTO.cfp.online ? (["online", "in-person"] as const) : (["in-person"] as const);
const LEVELS        = ["100", "200", "300", "400"] as const;
const LANGUAGES     = ["es", "en"] as const;

function validateBody(body: Record<string, unknown>) {
  const str = (v: unknown, max?: number) => {
    if (typeof v !== "string" || !v.trim()) return null;
    const clean = cleanWhitespace(v);
    if (!clean) return null;
    return max ? clean.slice(0, max) : clean;
  };
  /** Nombres y apellidos, con la caja ordenada. */
  const nombre = (v: unknown, max?: number) => {
    const base = str(v, max);
    return base === null ? null : toName(base);
  };
  /** Texto largo: se limpia pero conserva la caja — en mayúsculas es ilegible. */
  const long = (v: unknown, max?: number) => {
    if (typeof v !== "string" || !v.trim()) return null;
    const clean = cleanMultiline(v);
    if (!clean) return null;
    return max ? clean.slice(0, max) : clean;
  };
  /** URLs: sin tocar la caja, la ruta la distingue. */
  // Un enlace que no pasa la validación se guarda vacío: es mejor perder un
  // perfil de red social que publicar un enlace que no es lo que dice.
  const url = (v: unknown, red = "") => {
    if (typeof v !== "string") return "";
    const r = normalizeLink(v.slice(0, 300), red);
    return r.ok ? r.value : "";
  };
  // Las fotos sólo pueden ser subidas a nuestro bucket.
  const foto = (v: unknown) => (esDelBucket(v) ? v : "");
  const firstName  = nombre(body.firstName, 80);
  const lastName   = nombre(body.lastName, 80);
  const emailRaw   = typeof body.email === "string" ? body.email : "";
  const emailCheck = normalizeEmail(emailRaw);
  const email      = emailCheck.ok ? emailCheck.value.slice(0, 200) : null;
  // Cargo y título sin emoji: son los que salen en la tarjeta y en la agenda.
  const tagline    = sinEmoji(str(body.tagline, 120) ?? "") || null;
  const bio        = long(body.bio, 1000);
  const photo      = foto(body.photo);
  const talkTitle  = sinEmoji(str(body.talkTitle, 120) ?? "") || null;
  const abstract   = long(body.talkAbstract, 2000);
  const country    = nombre(body.countryCity, 120);

  const sessionType    = SESSION_TYPES.includes(body.sessionType as never) ? (body.sessionType as string) : null;
  const audienceLevel  = LEVELS.includes(body.audienceLevel as never)      ? (body.audienceLevel as string) : null;
  /** El track lo elige quien postula, y es obligatorio. */
  const track = typeof body.track === "string" && esTrack(body.track) ? body.track : null;
  const language       = LANGUAGES.includes(body.language as never)        ? (body.language as string) : null;
  const preRecordingDate = typeof body.preRecordingDate === "string" ? body.preRecordingDate.slice(0, 100) : "";

  const missing = [
    !firstName && "firstName",
    !lastName  && "lastName",
    !email     && "email",
    !tagline   && "tagline",
    !bio       && "bio",
    !photo     && "photo",
    !talkTitle && "talkTitle",
    !abstract  && "talkAbstract",
    !country   && "countryCity",
    !sessionType   && "sessionType",
    !audienceLevel && "audienceLevel",
    !track         && "track",
    !language      && "language",
    (sessionType === "online" && !preRecordingDate) && "preRecordingDate",
  ].filter(Boolean);

  if (missing.length) return { error: `Campos requeridos: ${missing.join(", ")}` };

  const social = (body.social && typeof body.social === "object") ? body.social as Record<string, unknown> : {};

  return {
    firstName:      firstName!,
    lastName:       lastName!,
    email:          email!,
    tagline:        tagline!,
    bio:            bio!,
    photo:          photo!,
    talkTitle:      talkTitle!,
    talkAbstract:   abstract!,
    sessionType:       sessionType!,
    preRecordingDate:  preRecordingDate,
    audienceLevel:     audienceLevel!,
    track:             track!,
    language:          language!,
    requirements:      long(body.requirements, 500) ?? "",
    countryCity:    country!,
    // Sólo dígitos y el "+" del indicativo: nunca espacios ni guiones.
    phone:          typeof body.phone === "string" ? cleanWhitespace(body.phone).replace(/[^\d+]/g, "").slice(0, 20) : "",
    firstTimeSpeaker: body.firstTimeSpeaker === true,
    coSpeakers:     Array.isArray(body.coSpeakers)
      ? (body.coSpeakers as unknown[]).slice(0, 3).map((cs) => {
          if (!cs || typeof cs !== "object") return null;
          const c = cs as Record<string, unknown>;
          const cs_social = (c.social && typeof c.social === "object") ? c.social as Record<string, unknown> : {};
          return {
            firstName: nombre(c.firstName, 80) ?? "",
            lastName:  nombre(c.lastName, 80) ?? "",
            email:     typeof c.email === "string" ? (normalizeEmail(c.email).value).slice(0, 200) : "",
            bio:       long(c.bio, 500) ?? "",
            photo:     foto(c.photo),
            social: {
              linkedin:  url(cs_social.linkedin, "linkedin"),
              twitter:   url(cs_social.twitter, "twitter"),
              instagram: url(cs_social.instagram, "instagram"),
            },
          };
        }).filter((c): c is NonNullable<typeof c> => c !== null)
      : [],
    social: {
      builderCenter: url(social.builderCenter, "builderCenter"),
      linkedin:      url(social.linkedin, "linkedin"),
      twitter:       url(social.twitter, "twitter"),
      instagram:     url(social.instagram, "instagram"),
      github:        url(social.github, "github"),
      blog:          url(social.blog),
    },
  };
}

// ── GET — list submissions (admin) ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await requireAccess("speakers", "ver", ["admin", "organizer"]);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    return Response.json({ error: msg }, { status: 403 });
  }

  await connectDB();
  const { searchParams } = req.nextUrl;
  // El status llega como texto libre de la query: se valida contra el enum del modelo antes de filtrar.
  const statusParam = searchParams.get("status");
  const filter =
    statusParam && statusParam !== "all" && isProfileStatus(statusParam)
      ? { status: statusParam }
      : {};

  const profiles = await SpeakerProfile.find(filter)
    .sort({ submittedAt: -1 })
    .lean();

  // Una fila por persona: el mismo documento trae el estado del trámite y sus
  // datos. Se arma acá y no en el navegador para que la tabla reciba campos
  // con nombre y tipo.
  const rows = profiles.map((p) => {
    return {
      id: String(p._id),
      slug: p.slug ?? "",
      status: p.status,
      speakerType: p.speakerType ?? null,
      approved: p.status === "accepted",
      approvedAt: p.approvedAt ? p.approvedAt.toISOString() : null,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : "",
      scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
      profileId: String(p._id),

      // El perfil público va en la misma respuesta: es el mismo documento.
      isPublic: p.isPublic ?? false,
      track: p.track ?? "general",
      sortOrder: p.sortOrder ?? 0,
      cardApproved: p.cardApproved ?? false,
      cardImageUrl: p.cardImageUrl ?? "",

      firstName: p?.firstName ?? "",
      lastName: p?.lastName ?? "",
      name: p?.name ?? "",
      email: p?.email ?? "",
      phone: p?.phone ?? "",
      countryCity: p?.countryCity ?? "",
      role: p?.role ?? "",
      tagline: p?.tagline ?? "",
      company: p?.company ?? "",
      companyLogo: p?.companyLogo ?? "",
      bio: p?.bio ?? "",
      photo: p?.photo ?? "",
      firstTimeSpeaker: p?.firstTimeSpeaker ?? false,

      talkTitle: p?.talkTitle ?? "",
      talkAbstract: p?.talkAbstract ?? "",
      sessionType: p?.sessionType ?? "",
      preRecordingDate: p?.preRecordingDate ?? "",
      audienceLevel: p?.audienceLevel ?? "",
      language: p?.language ?? "",
      requirements: p?.requirements ?? "",

      social: {
        builderCenter: p?.social?.builderCenter ?? "",
        linkedin: p?.social?.linkedin ?? "",
        twitter: p?.social?.twitter ?? "",
        github: p?.social?.github ?? "",
        instagram: p?.social?.instagram ?? "",
        website: p?.social?.website ?? "",
        blog: p?.social?.blog ?? "",
        facebook: p?.social?.facebook ?? "",
      },
      coSpeakers: (p?.coSpeakers ?? []).map((c) => ({
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email ?? "",
        role: c.role ?? "",
        company: c.company ?? "",
        // La ficha grande enseña la cara de los acompañantes, no sólo su nombre.
        photo: c.photo ?? "",
        tagline: c.tagline ?? "",
        countryCity: c.countryCity ?? "",
      })),
    };
  });

  return Response.json({ submissions: rows });
}

// ── POST — new submission (public) ───────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // El Call for Speakers cierra solo cuando pasa EVENTO.cfpCierre. Se comprueba
    // aca y no solo en el cliente: si dependiera del boton de la interfaz, una
    // peticion hecha a mano seguiria entrando despues del cierre anunciado.
    if (Date.now() > new Date(EVENTO.cfpCierre).getTime()) {
      return Response.json({ error: "La convocatoria de speakers está cerrada." }, { status: 403 });
    }

    const limite = rateLimit(`postulacion:${getIp(request)}`, 8, 60 * 60 * 1000);
    if (!limite.ok) {
      return Response.json({ error: "Demasiadas postulaciones seguidas. Intenta más tarde." }, { status: 429 });
    }

    await connectDB();

    const body = await request.json();

    // Captcha verification
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return Response.json({ error: "Captcha inválido. Por favor intenta de nuevo." }, { status: 400 });
    }

    const validated = validateBody(body);
    if ("error" in validated) {
      return Response.json({ error: validated.error }, { status: 400 });
    }

    const {
      firstName, lastName, email, tagline, bio, photo,
      talkTitle, talkAbstract, sessionType, preRecordingDate, audienceLevel, language,
      requirements, countryCity, phone, firstTimeSpeaker,
      coSpeakers, social, track,
    } = validated;

    await connectDB();

    // ¿Se puede postular más de una vez con el mismo correo?
    const ajuste = await Setting.findOne({ key: "speaker_multi_submit" }).lean();
    const variasPorCorreo = ajuste?.value !== "0";

    if (!variasPorCorreo) {
      // Se busca en el perfil, que es donde vive el correo desde que la
      // postulación guarda sólo el estado.
      const dup = await SpeakerProfile.findOne({ email });
      if (dup) {
        return Response.json(
          { error: "Ya tienes una postulación enviada con este correo" },
          { status: 409 },
        );
      }
    }


    // Un documento por persona: el perfil guarda tanto los datos como el estado del trámite.
    const baseSlug = buildSlugFromNames(firstName, lastName, coSpeakers);
    const slug = await uniqueSlug(baseSlug);

    const profile = await SpeakerProfile.create({
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      slug,
      role: tagline,
      tagline,
      bio,
      photo,
      talkTitle,
      talkAbstract,
      sessionType,
      preRecordingDate,
      audienceLevel,
      language,
      requirements,
      countryCity,
      phone,
      firstTimeSpeaker,
      coSpeakers,
      social,
      track,
      status: "submitted",
      isPublic: false,
      submittedAt: new Date(),
      metadata: {
        ip: getIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    // Acuse de recibo con copia de lo enviado.
    try {
      // El mensaje sale de la plantilla editable; la copia de lo enviado se
      // cuelga detrás, porque es un volcado distinto en cada correo y no
      // contenido que nadie quiera redactar.
      const correo = await armarCorreo(
        "speaker_postulacion",
        { nombre: firstName, nombreCompleto: `${firstName} ${lastName}`, correo: email, charla: talkTitle },
        [sessionType === "online" ? "online" : "presencial"],
        CopiaDeLaPropuesta({
          talkTitle, talkAbstract, sessionType, audienceLevel, language, track,
          countryCity, tagline, requirements,
          coSpeakerNames: coSpeakers.map((c) => `${c.firstName} ${c.lastName}`.trim()).filter(Boolean),
          slug: profile.slug,
        }),
      );
      if (!correo) throw new Error("plantilla speaker_postulacion no disponible");

      await sendEmail({
        from: EMAIL_FROM,
        to: email,
        subject: correo.asunto,
        html: correo.html,
      });
    } catch (mailErr) {
      console.error("[POST /api/speakers] acuse de recibo", mailErr);
    }

    return Response.json({ id: profile._id, slug: profile.slug }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/speakers]", err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
