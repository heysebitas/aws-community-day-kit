import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess, requireDelete } from "@/lib/auth";
import { AgendaEvent } from "@/models/agenda-event";
import { SpeakerProfile } from "@/models/speaker-profile";
import { revalidatePublic, AGENDA_TAG, SPEAKERS_TAG } from "@/lib/data/revalidate";
import { createLog } from "@/lib/log";
import { resolverSala } from "@/lib/agenda-sala";
import { horaDelEvento } from "@/config/fechas";
import { ruta } from "@/lib/api";

export const PUT = ruta(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireAccess("programa", "editar", ["admin", "organizer"]);
  await connectDB();

  const { id } = await params;
  const body = await request.json();
  const {
    title, speaker, speakerSlug, description,
    startTime, endTime, room, roomId,
    track, order, sessionType, level, language, cta,
    speakerId, imageUrl, cardImageUrl,
  } = body;

  if (!title || !startTime || !endTime) {
    return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  /** La sala, coherente. */
  const actual = await AgendaEvent.findById(id).select("roomId room").lean();
  if (!actual) return Response.json({ error: "Evento no encontrado" }, { status: 404 });

  const sala = await resolverSala(
    roomId !== undefined ? roomId : actual.roomId?.toString(),
    room ?? actual.room,
  );
  if (!sala.room) {
    return Response.json({ error: "Falta la sala" }, { status: 400 });
  }

  const event = await AgendaEvent.findByIdAndUpdate(
    id,
    {
      title, speaker, speakerSlug: speakerSlug ?? "",
      description, startTime, endTime,
      room: sala.room, roomId: sala.roomId, track, order,
      sessionType, level, language, cta,
      imageUrl: imageUrl || "", cardImageUrl: cardImageUrl || "",
      speakerId: speakerId || null,
    },
    { returnDocument: "after" },
  );

  if (!event) {
    return Response.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  // Sync time + room back to the linked SpeakerProfile
  if (event.speakerId) {
    const scheduledAt = horaDelEvento(startTime);
    await SpeakerProfile.findByIdAndUpdate(event.speakerId, {
      scheduledAt,
      roomId: sala.roomId,
    });
  }

  revalidatePublic(AGENDA_TAG, SPEAKERS_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "AGENDA_UPDATED",
    target: title,
    targetId: id,
    details: `${startTime}–${endTime} · ${sala.room}`,
  });

  return Response.json({ event });
});

export const DELETE = ruta(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireDelete("programa", ["admin", "organizer"]);
  await connectDB();

  const { id } = await params;
  const event = await AgendaEvent.findByIdAndDelete(id);

  if (!event) {
    return Response.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  // Un-schedule the linked SpeakerProfile
  if (event.speakerId) {
    await SpeakerProfile.findByIdAndUpdate(event.speakerId, {
      status: "accepted",
      scheduledAt: null,
      sessionId: null,
      roomId: null,
    });
  }

  revalidatePublic(AGENDA_TAG, SPEAKERS_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "AGENDA_DELETED",
    target: event.title,
    targetId: id,
  });

  return Response.json({ success: true });
});
