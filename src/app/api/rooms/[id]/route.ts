import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Room } from "@/models/room";
import { AgendaEvent } from "@/models/agenda-event";
import { requireAccess, requireDelete } from "@/lib/auth";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

export const PUT = ruta(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  await requireAccess("programa", "editar", ["admin", "organizer"]);
  const { id } = await params;
  const { name, capacity, virtualLink, track, order } = await req.json();

  await connectDB();
  const room = await Room.findByIdAndUpdate(
    id,
    { $set: { name, capacity, virtualLink, track, order } },
    { returnDocument: "after" },
  );
  if (!room) return Response.json({ error: "not found" }, { status: 404 });

  // Los bloques del programa guardan el nombre de la sala como texto además
  // del id, así que renombrar el salón tiene que arrastrarlos: si no, la
  // agenda sigue enseñando el nombre anterior.
  if (typeof name === "string" && name.trim()) {
    await AgendaEvent.updateMany({ roomId: id }, { $set: { room: name.trim() } });
  }

  return Response.json({ room });
});

export const DELETE = ruta(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  await requireDelete("programa", ["admin", "organizer"]);
  const { id } = await params;
  await connectDB();
  await Room.findByIdAndDelete(id);
  return Response.json({ ok: true });
});
