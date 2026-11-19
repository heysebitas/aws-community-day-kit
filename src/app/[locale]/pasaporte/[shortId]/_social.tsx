import { avatarUrl } from "@/lib/avatar";
import { EVENTO, PAIS } from "@/config";

/* ── Social platforms ──
   atSign: el handle se muestra con @ (Builder Center, Instagram, TikTok).
   domains: para validar un enlace pegado. prefix: hint en modo "usuario".
   Se guarda siempre el USERNAME; urlFn arma la URL. */
export const SOCIAL_PLATFORMS = [
  {
    id: "builderCenter" as const,
    label: "Builder Center", bg: "#232F3E",
    placeholder: "user_ph", atSign: true,
    domains: ["builder.aws.com"], prefix: "builder.aws.com/community/@",
    urlFn: (u: string) => `https://builder.aws.com/community/@${u}`,
    icon: (
      <img src="/images/logos/aws-logo.svg" alt="AWS" style={{ height: 13, width: "auto", filter: "brightness(0) invert(1)" }} />
    ),
  },
  {
    id: "linkedin" as const,
    label: "LinkedIn", bg: "#0077B5",
    placeholder: "user_ph", atSign: false,
    domains: ["linkedin.com"], prefix: "linkedin.com/in/",
    urlFn: (u: string) => `https://linkedin.com/in/${u}`,
    icon: <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
  },
  {
    id: "instagram" as const,
    label: "Instagram", bg: "#E1306C",
    placeholder: "user_ph_dot", atSign: true,
    domains: ["instagram.com"], prefix: "instagram.com/",
    urlFn: (u: string) => `https://instagram.com/${u}`,
    icon: <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  },
  {
    id: "x" as const,
    label: "X / Twitter", bg: "#14171A",
    placeholder: "user_ph_underscore", atSign: false,
    domains: ["x.com", "twitter.com"], prefix: "x.com/",
    urlFn: (u: string) => `https://x.com/${u}`,
    icon: <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  {
    id: "github" as const,
    label: "GitHub", bg: "#24292f",
    placeholder: "user_ph", atSign: false,
    domains: ["github.com"], prefix: "github.com/",
    urlFn: (u: string) => `https://github.com/${u}`,
    icon: <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>,
  },
  {
    id: "tiktok" as const,
    label: "TikTok", bg: "#010101",
    placeholder: "user_ph_dot", atSign: true,
    domains: ["tiktok.com"], prefix: "tiktok.com/@",
    urlFn: (u: string) => `https://tiktok.com/@${u}`,
    icon: <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.77a4.85 4.85 0 0 1-1-.08z"/></svg>,
  },
] as const;

export type SocialPlatformId = typeof SOCIAL_PLATFORMS[number]["id"];

/* Saca el username de un enlace pegado (valida dominio). Devuelve null si no corresponde. */
export function usernameFromLink(plat: typeof SOCIAL_PLATFORMS[number], raw: string): string | null {
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (!(plat.domains as readonly string[]).includes(host)) return null;
  const segs = u.pathname.split("/").map((s) => s.trim()).filter(Boolean);
  let user = "";
  if (plat.id === "linkedin") { const i = segs.indexOf("in"); user = i >= 0 ? segs[i + 1] ?? "" : segs[segs.length - 1] ?? ""; }
  else if (plat.id === "builderCenter") { const i = segs.indexOf("community"); user = i >= 0 ? segs[i + 1] ?? "" : segs[segs.length - 1] ?? ""; }
  else { user = segs[0] ?? ""; }
  user = user.replace(/^@+/, "");
  return /^[A-Za-z0-9._-]{1,60}$/.test(user) ? user : null;
}

/* Limpia un username escrito a mano. Devuelve null si no es válido. */
export function cleanUsername(raw: string): string | null {
  const u = raw.trim().replace(/^@+/, "").replace(/\s+/g, "");
  return /^[A-Za-z0-9._-]{1,60}$/.test(u) ? u : null;
}

/** El rol se muestra con el texto del idioma; «speaker» se dice igual. */
export const ROLE_LABEL: Record<string, string> = {
  attendee: "role_attendee", speaker: "role_speaker",
  volunteer: "role_volunteer", organizer: "role_organizer",
};
export const ROLE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  attendee:  { bg: "rgba(14,165,233,.12)",  text: "#7dd3fc", border: "rgba(14,165,233,.3)"  },
  speaker:   { bg: "rgb(var(--tema-acento-rgb) / .12)",   text: "var(--color-acento)", border: "rgb(var(--tema-acento-rgb) / .45)"  },
  volunteer: { bg: "rgba(52,211,153,.12)",  text: "#6ee7b7", border: "rgba(52,211,153,.3)"  },
  organizer: { bg: "rgba(167,139,250,.12)", text: "#c4b5fd", border: "rgba(167,139,250,.3)" },
};

export interface PassportSocial {
  builderCenter?: string; linkedin?: string; instagram?: string;
  x?: string; github?: string; tiktok?: string;
}
export interface PassportStats {
  views: number;
  clicks: Record<string, number>;
}
export interface PassportData {
  shortId: string; role: string; firstName: string; lastName: string;
  company?: string; jobTitle?: string; social?: PassportSocial;
  stats?: PassportStats;
  stamps: { sponsorId: string; sponsorName: string; stampedAt: string }[];
}
export interface Sponsor { _id: string; sponsorName: string; logoUrl?: string; }

/** Lo que se deduce del pasaporte y los patrocinadores; la vista lo reparte a sus partes. */
export function calcular(passport: PassportData, sponsors: Sponsor[], shortId: string) {
  const collectedIds   = new Set(passport.stamps.map((s) => s.sponsorId));
  const totalSponsors  = sponsors.length;
  const totalCollected = passport.stamps.filter((s) => sponsors.some((sp) => sp._id === s.sponsorId)).length;
  const progressPct    = totalSponsors ? (totalCollected / totalSponsors) * 100 : 0;
  const roleStyle      = ROLE_STYLE[passport.role] ?? ROLE_STYLE.attendee!;
  const avatarSrc      = avatarUrl(shortId);
  const activeSocials  = SOCIAL_PLATFORMS.filter((p) => { const v = passport.social?.[p.id]; return v && v.trim().length > 0; });

  /* MRZ */
  const pad = (s: string, n: number) => s.toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(n, "<").slice(0, n);
  const mrz1 = `AWSSCD<<${pad(passport.lastName, 18)}<<${pad(passport.firstName, 10)}`;
  // País y fecha del evento, como en una MRZ real: código de país a 3 y fecha AAMMDD.
  const fechaMrz = EVENTO.fecha.inicio.slice(2, 10).replace(/-/g, "");
  const mrz2 = `${shortId.toUpperCase().padEnd(12, "<")}${pad(PAIS.codigo, 3)}${fechaMrz}${pad(passport.role, 9)}`;
  return { collectedIds, totalSponsors, totalCollected, progressPct, roleStyle, avatarSrc, activeSocials, mrz1, mrz2 };
}
