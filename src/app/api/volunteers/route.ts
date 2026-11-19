import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Form } from "@/models/form";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { parseVolunteerInput } from "@/lib/volunteer-input";
import { checkAlreadyAttendee } from "@/lib/duplicate-check";
import { verifyCaptcha } from "@/lib/captcha";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { ruta } from "@/lib/api";
import { sinDocumento } from "@/lib/privacidad";
import { devolverCupo, reservarCupo, sincronizarCupo } from "@/lib/cupo";

export const GET = ruta(async () => {
  const user = await requireAccess("volunteers", "ver", ["admin", "organizer"]);
  await connectDB();

  const submissions = await VolunteerSubmission.find({}).sort({ submittedAt: -1 }).lean();
  return Response.json({ submissions: submissions.map((s) => sinDocumento(s, user.role)) });
});

export const POST = ruta(async (request: NextRequest) => {
  const body = await request.json();
  const manual = body.manual === true;

  // El alta manual la hace el staff ya autenticado; el resto pasa por límite
  // de peticiones y captcha.
  let actor = null;
  if (manual) {
    actor = await requireAccess("volunteers", "editar", ["admin", "organizer"]);
  } else {
    const rl = rateLimit(`vol:${getIp(request)}`, 30, 15 * 60 * 1000);
    if (!rl.ok) {
      return Response.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    if (!(await verifyCaptcha(captchaToken))) {
      return Response.json({ error: "Captcha inválido. Por favor intenta de nuevo." }, { status: 400 });
    }
  }

  await connectDB();

  let maxSubmissions: number | null = null;
  // Las preguntas son fijas; el formulario guardado sólo dice si la convocatoria está abierta.
  if (!manual) {
    const form = await Form.findOne({ formType: "volunteer", isOpen: true });
    if (!form) {
      return Response.json({ error: "El formulario no está disponible" }, { status: 404 });
    }
    maxSubmissions = form.maxSubmissions;
  }

  const parsed = parseVolunteerInput(
    (body.data ?? {}) as Record<string, unknown>,
    { manual },
  );
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const data = parsed.data;

  // Una postulación por correo; la garantía real es el índice único.
  const existing = await VolunteerSubmission.findOne({ email: data.email });
  if (existing) {
    return Response.json(
      { error: "Ya enviaste una solicitud como voluntario" },
      { status: 409 },
    );
  }

  // Cruce con la lista de asistentes: no se puede estar en las dos.
  if (!manual) {
    const cross = await checkAlreadyAttendee(data.email);
    if (cross.blocked) {
      return Response.json({ error: cross.error }, { status: 409 });
    }
  }

  if (!(await reservarCupo("volunteer", maxSubmissions))) {
    return Response.json({ error: "Se alcanzó el límite de respuestas" }, { status: 400 });
  }

  // El índice único cierra la carrera entre el findOne y el create.
  let submission;
  try {
    submission = await VolunteerSubmission.create({
      ...data,
      approvedBy: manual && actor ? actor._id.toString() : null,
      metadata: {
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });
  } catch (e) {
    await devolverCupo("volunteer", maxSubmissions);
    if ((e as { code?: number }).code === 11000) {
      return Response.json(
        { error: "Ya enviaste una solicitud como voluntario" },
        { status: 409 },
      );
    }
    throw e;
  }

  if (manual) await sincronizarCupo("volunteer");

  return Response.json({ id: submission._id }, { status: 201 });
});
