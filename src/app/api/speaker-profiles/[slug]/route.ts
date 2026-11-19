import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess, requireDelete } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { revalidatePublic, SPEAKERS_TAG, AGENDA_TAG } from "@/lib/data/revalidate";
import { createLog } from "@/lib/log";
import { ruta, logError } from "@/lib/api";

// Public: single profile by slug
export const GET = ruta(async (
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  try {
    await connectDB();
    const { slug } = await params;
    const profile = await SpeakerProfile.findOne({ slug, isPublic: true }).lean();
    if (!profile) return Response.json({ code: "no_encontrado", error: "No encontrado" }, { status: 404 });
    return Response.json({ profile });
  } catch (e) {
    logError("speaker-profiles/[slug] GET", e);
    return Response.json({ code: "error_interno", error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "speaker-profiles/[slug] GET" });

// Admin: partial update (isPublic, status, roomId, track…)
export const PATCH = ruta(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const user = await requireAccess("speakers", "editar", ["admin", "organizer"]);
  await connectDB();

  const { slug } = await params;
  const body = await request.json();

  const allowed = ["isPublic", "status", "roomId", "track", "speakerType", "scheduledAt", "sessionId", "talkTitleCard", "roleCard", "cardContentX", "cardContentY", "cardNameOffset", "cardTitleSize", "cardNameSize", "cardPhotoX", "cardPhotoY", "cardPhotoZoom"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // Cambiar cualquier ajuste de la tarjeta invalida la imagen ya subida a
  // S3: deja de coincidir con lo que se ve en el editor.
  const AJUSTES_TARJETA = [
    "talkTitleCard", "roleCard", "cardContentX", "cardContentY", "cardNameOffset",
    "cardTitleSize", "cardNameSize", "cardPhotoX", "cardPhotoY", "cardPhotoZoom",
    "track",
  ];
  if (AJUSTES_TARJETA.some((k) => k in body)) {
    update.cardApproved = false;
    update.cardImageUrl = "";
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const profile = await SpeakerProfile.findOneAndUpdate({ slug }, update, { returnDocument: "after" });
  if (!profile) return Response.json({ error: "No encontrado" }, { status: 404 });

  revalidatePublic(SPEAKERS_TAG, AGENDA_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "SPEAKER_PROFILE_PATCHED",
    target: profile.name,
    targetId: profile._id.toString(),
    details: JSON.stringify(update),
  });

  return Response.json({ profile });
});

// Admin: update profile
export const PUT = ruta(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const user = await requireAccess("speakers", "editar", ["admin", "organizer"]);
  await connectDB();

  const { slug } = await params;
  const body = await request.json();
  const { name, role, tagline, company, companyLogo, bio, photo, social, talkTitle, talkAbstract, track, sessionId, submissionId, isPublic } = body;

  const profile = await SpeakerProfile.findOneAndUpdate(
    { slug },
    { name, role, tagline, company, companyLogo, bio, photo, social, talkTitle, talkAbstract, track, sessionId: sessionId || null, submissionId: submissionId || null, isPublic },
    { returnDocument: "after" },
  );

  if (!profile) return Response.json({ error: "No encontrado" }, { status: 404 });

  revalidatePublic(SPEAKERS_TAG, AGENDA_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "SPEAKER_PROFILE_UPDATED",
    target: profile.name,
    targetId: profile._id.toString(),
    details: slug,
  });

  return Response.json({ profile });
});

// Admin: delete profile
export const DELETE = ruta(async (
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const user = await requireDelete("speakers", ["admin", "organizer"]);
  await connectDB();

  const { slug } = await params;
  const profile = await SpeakerProfile.findOneAndDelete({ slug });

  if (!profile) return Response.json({ error: "No encontrado" }, { status: 404 });

  revalidatePublic(SPEAKERS_TAG, AGENDA_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "SPEAKER_PROFILE_DELETED",
    target: profile.name,
    targetId: profile._id.toString(),
  });

  return Response.json({ success: true });
});
