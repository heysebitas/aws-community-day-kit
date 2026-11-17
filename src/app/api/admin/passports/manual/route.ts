import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { connectDB } from "@/lib/db";
import { nuevoPin } from "@/lib/pin";
import { requireAuth } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { ruta } from "@/lib/api";

export const POST = ruta(async (req: NextRequest) => {
  await requireAuth(["admin"]);
  const { firstName, lastName, company, jobTitle, role } = await req.json();

  if (!firstName?.trim()) {
    return Response.json({ error: "Nombre requerido" }, { status: 400 });
  }
  const validRoles = ["attendee", "speaker", "volunteer", "organizer"];
  if (!validRoles.includes(role)) {
    return Response.json({ error: "Rol inválido" }, { status: 400 });
  }

  await connectDB();

  const viewPin = nuevoPin();
  const doc = await Passport.create({
    shortId: nanoid(8),
    role,
    firstName: firstName.trim(),
    lastName: lastName?.trim() || "",
    company: company?.trim() || undefined,
    jobTitle: jobTitle?.trim() || undefined,
    isManual: true,
    viewPin,
  });

  return Response.json({ passport: doc }, { status: 201 });
});
