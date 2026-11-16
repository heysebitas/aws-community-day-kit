import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { registrationToVolunteer } from "@/lib/moves";

/** Mueve un registro a la lista de voluntarios. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
