import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Registration } from "@/models/registration";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { buildRegistrationEmail } from "@/lib/registration-email";
import { ruta } from "@/lib/api";
import { normalizeEmail } from "@/lib/normalize";

export const POST = ruta(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  await requireAccess("registrations", "editar", ["admin", "organizer"]);
  await connectDB();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const newEmail = typeof body.email === "string" ? body.email : undefined;

  const registration = await Registration.findById(id);
  if (!registration) {
    return Response.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  // Corrección del correo cuando rebotó.
  if (newEmail) {
    const check = normalizeEmail(newEmail);
    if (!check.ok) return Response.json({ error: check.reason }, { status: 400 });
    if (check.value !== registration.email) {
      registration.email = check.value;
      try {
        await registration.save();
      } catch (e) {
        if ((e as { code?: number }).code === 11000) {
          return Response.json({ error: "Ese correo ya está registrado en el evento" }, { status: 409 });
        }
        throw e;
      }
    }
  }

  const email = registration.email;
  if (!email) {
    return Response.json({ error: "No se encontró correo electrónico en el registro" }, { status: 400 });
  }

  const name = `${registration.firstName} ${registration.lastName}`.trim();

  // Mismo armado que el registro nuevo: si esta persona eligió el Track
  // Online, el reenvío tampoco lleva QR ni pase adjunto.
  const built = await buildRegistrationEmail(name, registration.qrCode, registration.attendance);
  const html = `${built.html}<!-- ref:${registration.qrCode} -->`;

  const result = await sendEmail({
    from: EMAIL_FROM,
    to: email,
    subject: built.subject,
    html,
    attachments: built.attachments,
  });

  if (result.error) {
    registration.emailStatus = "failed";
    registration.emailError = result.error;
  } else {
    registration.emailStatus = "sent";
    registration.emailSentAt = new Date();
    registration.resendId = result.id;
    registration.emailError = null;
  }
  await registration.save();

  return Response.json({
    success: !result.error,
    emailStatus: registration.emailStatus,
    emailSentAt: registration.emailSentAt,
  });
}, { error: "Error interno al reenviar" });
