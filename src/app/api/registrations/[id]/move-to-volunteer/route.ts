import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { registrationToVolunteer } from "@/lib/moves";
import { ruta } from "@/lib/api";

/** Mueve un registro a la lista de voluntarios. */
export const POST = ruta(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const actor = await requireAuth(["admin"]);
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { data?: Record<string, unknown> };

  await connectDB();
  const result = await registrationToVolunteer(id, body.data ?? {}, {
    _id: actor._id,
    name: actor.name,
    role: actor.role,
  });

  if (result.ok) return Response.json({ ok: true, createdVolunteer: true, done: result.done });
  if ("needs" in result) {
    return Response.json({ needs: result.needs, message: result.message }, { status: 422 });
  }
  return Response.json({ error: result.error }, { status: 409 });
});
