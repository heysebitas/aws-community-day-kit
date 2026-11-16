import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { connectDB } from "@/lib/db";
import { EventConfig } from "@/models/event-config";
import { EVENT_CONFIG_TAG } from "@/lib/data/event-config";
import { requireAuth } from "@/lib/auth";
import { sanearEnlaces } from "@/data/enlaces";
import { enlacesActuales } from "@/lib/enlaces";
import { createLog } from "@/lib/log";

export async function GET() {
  await connectDB();
  const config = await EventConfig.findOne().lean() as Record<string, unknown> | null;

  /** Los consejos y los enlaces operativos son sólo para el equipo. */
  let isStaff = false;
  try {
    await requireAuth(["admin", "organizer"]);
    isStaff = true;
  } catch {
    isStaff = false;
  }

  return NextResponse.json({
    trackVirtualUrl:  (config?.trackVirtualUrl as string | undefined) ?? "",
    photosUrl:        (config?.photosUrl as string | undefined) ?? "",
    recordingsUrl:    (config?.recordingsUrl as string | undefined) ?? "",
    notifyUrl:    (config?.notifyUrl as string | undefined) ?? "",
    showSponsorsCta:  (config?.showSponsorsCta as boolean | undefined) ?? true,
    showSpeakerCta:   (config?.showSpeakerCta as boolean | undefined) ?? true,
    ...(isStaff ? {
      /** Los valores en efecto, no el crudo de la base. */
      enlaces:          (await enlacesActuales()).valores,
      // Lo lee el editor de tarjetas. No es del sitio público, así que va
      // entre lo del equipo.
      tarjetaDominio:   (config?.tarjetaDominio as boolean | undefined) !== false,
    } : {}),
  });
}

/** Estos enlaces salen como `href` en el sitio: sólo http(s), o vacío. */
function urlWeb(valor: unknown): string {
  if (typeof valor !== "string" || !valor.trim()) return "";
  try {
    const u = new URL(valor.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export async function PATCH(req: Request) {
  let actor: Awaited<ReturnType<typeof requireAuth>>;
  try {
    actor = await requireAuth(["admin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  const stringFields = ["trackVirtualUrl", "photosUrl", "recordingsUrl", "notifyUrl"];
  for (const f of stringFields) {
    if (f in body) updates[f] = urlWeb(body[f]);
  }
  if ("showSponsorsCta" in body && typeof body.showSponsorsCta === "boolean") updates.showSponsorsCta = body.showSponsorsCta;
  if ("tarjetaDominio" in body && typeof body.tarjetaDominio === "boolean") updates.tarjetaDominio = body.tarjetaDominio;
  if ("showSpeakerCta" in body && typeof body.showSpeakerCta === "boolean") updates.showSpeakerCta = body.showSpeakerCta;
  /** Los enlaces se guardan enteros, no clave por clave. */
  if ("enlaces" in body) updates.enlaces = sanearEnlaces(body.enlaces);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  await connectDB();
  await EventConfig.findOneAndUpdate({}, { $set: updates }, { upsert: true });
  revalidateTag(EVENT_CONFIG_TAG, { expire: 0 });

  await createLog({
    userId: String(actor._id), userName: actor.name, userRole: actor.role,
    action: "EVENT_CONFIG_UPDATED",
    target: "Configuración del evento",
    details: Object.keys(updates).join(", "),
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  let actor: Awaited<ReturnType<typeof requireAuth>>;
  try {
    actor = await requireAuth(["admin"]);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const pick = (k: string) => (typeof body[k] === "string" ? body[k].trim() : "");
  const pickBool = (k: string, fallback: boolean) => (typeof body[k] === "boolean" ? body[k] : fallback);
  await connectDB();
  const config = await EventConfig.findOneAndUpdate(
    {},
    {
      trackVirtualUrl:  pick("trackVirtualUrl"),
      photosUrl:        pick("photosUrl"),
      recordingsUrl:    pick("recordingsUrl"),
      notifyUrl:    pick("notifyUrl"),
      showSponsorsCta:  pickBool("showSponsorsCta", true),
      showSpeakerCta:   pickBool("showSpeakerCta", true),
      // `enlaces` queda fuera a propósito: este PUT escribe el objeto
      // completo, y lo que no se nombra se borra. Los enlaces se guardan por
      // PATCH, para que mandar el formulario grande no se los lleve.
    },
    { upsert: true, returnDocument: "after" },
  );
  revalidateTag(EVENT_CONFIG_TAG, { expire: 0 });

  await createLog({
    userId: String(actor._id), userName: actor.name, userRole: actor.role,
    action: "EVENT_CONFIG_UPDATED",
    target: "Configuración del evento",
    details: "Formulario de configuración",
  });

  return NextResponse.json({
    trackVirtualUrl:  config.trackVirtualUrl,
    photosUrl:        config.photosUrl,
    recordingsUrl:    config.recordingsUrl,
    notifyUrl:    config.notifyUrl,
    showSponsorsCta:  config.showSponsorsCta,
    showSpeakerCta:   config.showSpeakerCta,
  });
}
