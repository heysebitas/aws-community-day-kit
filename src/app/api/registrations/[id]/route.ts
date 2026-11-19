import { NextRequest } from "next/server";
import { sincronizarCupo } from "@/lib/cupo";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Registration } from "@/models/registration";
import { Passport } from "@/models/passport";
import { createLog } from "@/lib/log";
import { ruta } from "@/lib/api";

export const DELETE = ruta(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireAuth(["admin"]);
  const { id } = await params;

  await connectDB();

  const registration = await Registration.findById(id);
  if (!registration) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  const name = `${registration.firstName} ${registration.lastName}`.trim();

  // En cascada: borra el pasaporte (con sus sellos, asistencia, comidas y stats).
  const passportResult = await Passport.deleteMany({ linkedRegistrationId: id });

  await Registration.findByIdAndDelete(id);
  await sincronizarCupo("attendee");

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "REGISTRATION_DELETED",
    target: name,
    targetId: id,
    details: `${passportResult.deletedCount} pasaporte(s) eliminado(s)`,
  });

  return Response.json({ ok: true, passportsDeleted: passportResult.deletedCount });
});
