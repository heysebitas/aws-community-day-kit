import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Room } from "@/models/room";
import { requireAccess } from "@/lib/auth";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const rooms = await Room.find().sort({ order: 1, name: 1 }).lean();
  return Response.json({ rooms });
}

export const POST = ruta(async (req: NextRequest) => {
  await requireAccess("programa", "editar", ["admin", "organizer"]);
  const { name, capacity, virtualLink, track, order } = await req.json();
  if (!name?.trim()) return Response.json({ error: "name required" }, { status: 400 });

  await connectDB();
  const room = await Room.create({
    name: name.trim(),
    capacity: capacity ?? undefined,
    virtualLink: virtualLink ?? "",
    track: track ?? "",
    order: order ?? 0,
  });

  return Response.json({ room }, { status: 201 });
});
