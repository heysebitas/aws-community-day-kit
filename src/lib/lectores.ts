import { connectDB } from "@/lib/db";
import { Passport, type IPassport } from "@/models/passport";
import { SponsorPin } from "@/models/sponsor-pin";
import { nuevoPin } from "@/lib/pin";
import { getAuthUser } from "@/lib/auth";
import type { IUser } from "@/models/user";

export const SOCIAL_KEYS = ["builderCenter", "linkedin", "instagram", "x", "github", "tiktok"] as const;

/** Lo único que sale al público. El resto del documento es operación interna. */
export function publico(p: IPassport) {
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

/**
 * El pasaporte como lo ve cualquiera, leído directo de la base: lo usan la API
 * y la página de servidor, así las dos devuelven los mismos campos. Devuelve
 * también el documento para quien necesite comprobar el PIN.
 */
export async function leerPasaporte(shortId: string) {
  await connectDB();
  const doc = await Passport.findOne({ shortId });
  if (!doc) return null;
  if (!doc.viewPin) {
    doc.viewPin = nuevoPin();
    await doc.save();
  }
  const sponsors = await SponsorPin.find({ isActive: true }).select("_id sponsorName logoUrl").lean();
  return { doc, datos: { passport: publico(doc), sponsors, isOwner: false } };
}

/** El usuario como lo ve el cliente: lo que devuelve `/api/auth/me`. */
export function usuarioParaCliente(user: IUser) {
  return {
    id: String(user._id), name: user.name, email: user.email, role: user.role,
    // El menú y las páginas los usan para esconder lo que no corresponde.
    // Esconder es cortesía: quien manda es `requireAccess` en el servidor.
    permisos: user.permisos ?? [],
  };
}

/** La sesión de la cookie leída en el servidor; `null` si no hay o si falla la base. */
export async function leerUsuarioInicial() {
  try {
    const user = await getAuthUser();
    return user ? usuarioParaCliente(user) : null;
  } catch {
    return null;
  }
}
