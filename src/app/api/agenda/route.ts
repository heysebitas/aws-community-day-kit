import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { AgendaEvent } from "@/models/agenda-event";
import { SpeakerProfile } from "@/models/speaker-profile";
import { getAgendaEvents } from "@/lib/data/agenda";
import { revalidatePublic, AGENDA_TAG, SPEAKERS_TAG } from "@/lib/data/revalidate";
import { createLog } from "@/lib/log";
import { resolverSala } from "@/lib/agenda-sala";
import { horaDelEvento } from "@/config/fechas";
import { ruta, logError } from "@/lib/api";

const CACHE_PUBLICA = "public, s-maxage=60, stale-while-revalidate=300";

export const GET = ruta(async () => {
  try {
    const events = await getAgendaEvents();
    return Response.json({ events }, { headers: { "Cache-Control": CACHE_PUBLICA } });
  } catch (e) {
    logError("agenda GET", e);
    return Response.json({ code: "error_interno", error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "agenda GET" });

export const POST = ruta(async (request: NextRequest) => {
  const user = await requireAccess("programa", "editar", ["admin", "organizer"]);
  await connectDB();

  const body = await request.json();
  const {
    title, speaker, speakerSlug, description,
    startTime, endTime, room,
    track, order, sessionType, level, language, cta,
    speakerId, roomId, imageUrl, cardImageUrl,
  } = body;

  if (!title || !startTime || !endTime) {
    return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // El id del salón manda y el nombre se deriva de él. Ver `resolverSala`.
  const sala = await resolverSala(roomId, room);
  if (!sala.room) {
    return Response.json({ error: "Falta la sala" }, { status: 400 });
  }

  const event = await AgendaEvent.create({
    title,
    speaker: speaker || "",
    speakerSlug: speakerSlug || "",
    description: description || "",
    startTime,
    endTime,
    room: sala.room,
    roomId: sala.roomId ?? undefined,
    track: track || "general",
    order: order || 0,
    sessionType: sessionType || "presencial",
    level: level || "",
    language: language || "es",
    cta: cta || "",
    imageUrl: imageUrl || "",
    cardImageUrl: cardImageUrl || "",
    speakerId: speakerId || null,
  });

  // Sync the linked SpeakerProfile when scheduling a session
  if (speakerId) {
    const scheduledAt = horaDelEvento(startTime);
    await SpeakerProfile.findByIdAndUpdate(speakerId, {
      scheduledAt,
      sessionId: event._id,
      roomId: roomId || null,
      status: "scheduled",
      isPublic: true,
    });
  }

  revalidatePublic(AGENDA_TAG, SPEAKERS_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "AGENDA_CREATED",
    target: title,
    targetId: event._id.toString(),
    details: `${startTime}–${endTime} · ${room}`,
  });

  return Response.json({ event }, { status: 201 });
});
