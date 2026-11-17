import { esTrack } from "@/data/session-tracks";
import { cleanWhitespace, cleanMultiline, normalizeEmail, normalizeLink, sinEmoji, toName } from "@/lib/normalize";
import { esDelBucket } from "@/lib/subidas";
import { EVENTO } from "@/config";

export function toSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildSlugFromNames(firstName: string, lastName: string, coSpeakers: { firstName: string; lastName: string }[]): string {
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

// Mientras EVENTO.cfp.online esté apagado, «online» no es un valor válido:
// se cae en «Campos requeridos: sessionType», igual que si no hubieran elegido.
const SESSION_TYPES = EVENTO.cfp.online ? (["online", "in-person"] as const) : (["in-person"] as const);
const LEVELS        = ["100", "200", "300", "400"] as const;
const LANGUAGES     = ["es", "en"] as const;

export type SpeakerInput = Extract<ReturnType<typeof validarCampos>, { ok: true }>["value"];

/** Valida el cuerpo de una postulación: el valor limpio, o el error para el 400. */
export function parseSpeakerInput(raw: unknown): { ok: true; value: SpeakerInput } | { ok: false; error: string } {
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const r = validarCampos(body);
  return r;
}

function validarCampos(body: Record<string, unknown>) {
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

  if (missing.length) return { ok: false as const, error: `Campos requeridos: ${missing.join(", ")}` };

  const social = (body.social && typeof body.social === "object") ? body.social as Record<string, unknown> : {};

  const value = {
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
  return { ok: true as const, value };
}
