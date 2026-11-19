import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { connectDB } from "@/lib/db";
import { nuevoPin } from "@/lib/pin";
import { requireAccess } from "@/lib/auth";
import { Form } from "@/models/form";
import { Registration } from "@/models/registration";
import { enviarCorreoRegistro, despuesDeResponder } from "@/lib/registro-correo";
import { parseRegistrationInput } from "@/lib/registration-input";
import { roleLabelOf } from "@/data/attendee-form";
import { createLog } from "@/lib/log";
import { checkAlreadyVolunteer } from "@/lib/duplicate-check";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { Passport } from "@/models/passport";
import { verifyCaptcha } from "@/lib/captcha";
import { ruta } from "@/lib/api";
import { devolverCupo, reservarCupo, sincronizarCupo } from "@/lib/cupo";

// Lo que pinta el panel; el resto (campañas, `busqueda`, `__v`) no viaja.
const CAMPOS_PANEL =
  "firstName lastName email attendance documentType documentNumber role roleOther entityType entityName " +
  "consent qrCode checkedIn checkedInAt checkedInBy isManual emailStatus emailError emailSentAt resendId " +
  "confirmation createdAt updatedAt";

export const GET = ruta(async (request: NextRequest) => {
  await requireAccess("registrations", "ver", ["admin", "organizer", "volunteer"]);

  await connectDB();

  // Cursor = «createdAt_id» del último registro de la página anterior.
  const params = request.nextUrl.searchParams;
  const limite = Math.min(Math.max(parseInt(params.get("limit") ?? "", 10) || 200, 1), 500);
  const filtro: Record<string, unknown> = {};
  const cursor = params.get("cursor");
  if (cursor) {
    const [ms, id] = cursor.split("_");
    const fecha = new Date(Number(ms));
    if (!id || !mongoose.isValidObjectId(id) || Number.isNaN(fecha.getTime())) {
      return Response.json({ error: "Cursor inválido" }, { status: 400 });
    }
    filtro.$or = [{ createdAt: { $lt: fecha } }, { createdAt: fecha, _id: { $lt: id } }];
  }

  const filas = await Registration.find(filtro)
    .select(CAMPOS_PANEL)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limite + 1)
    .lean();
  const hayMas = filas.length > limite;
  const registrations = hayMas ? filas.slice(0, limite) : filas;
  const ultimo = registrations[registrations.length - 1];
  const nextCursor = hayMas && ultimo ? `${ultimo.createdAt.getTime()}_${ultimo._id}` : null;
  return Response.json({ registrations, nextCursor });
});

export const POST = ruta(async (request: NextRequest) => {
  let body: Record<string, unknown>;
  try {
    const crudo: unknown = await request.json();
    if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) {
      return Response.json({ error: "Datos de formulario inválidos" }, { status: 400 });
    }
    body = crudo as Record<string, unknown>;
  } catch {
    // Un cuerpo que no es JSON es una entrada inválida, no un fallo del servidor.
    return Response.json({ error: "Datos de formulario inválidos" }, { status: 400 });
  }
  const manual = Boolean(body.manual);
  const skipEmail = Boolean(body.skipEmail);
  const initialCheckedIn = Boolean(body.checkedIn);
  const generatePassport = body.generatePassport !== false;
  // El cuerpo va directo al parser: es él quien exige que cada valor sea texto
  // —lo que bloquea un `{$gt: ""}`—, lo recorta y lo valida contra el catálogo.
  const input = (body.data ?? {}) as Record<string, unknown>;
  if (typeof input !== "object" || Array.isArray(input)) {
    return Response.json({ error: "Datos de formulario inválidos" }, { status: 400 });
  }

  // If manual, require auth
  let actor = null;
  if (manual) {
    actor = await requireAccess("registrations", "editar", ["admin", "organizer", "volunteer"]);
  }

  // Rate limit + captcha solo para registros públicos
  // (los manuales los crea el staff ya autenticado).
  if (!manual) {
    const rl = rateLimit(`reg:${getIp(request)}`, 300, 15 * 60 * 1000);
    if (!rl.ok) {
      return Response.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return Response.json({ error: "Captcha inválido. Por favor intenta de nuevo." }, { status: 400 });
    }
  }

  await connectDB();

  let maxSubmissions: number | null = null;
  // Las preguntas son fijas; el formulario guardado sólo dice si el registro
  // está abierto. Un alta manual entra aunque esté cerrado.
  if (!manual) {
    const form = await Form.findOne({ formType: "attendee", isOpen: true });
    if (!form) {
      return Response.json({ error: "El registro no está disponible" }, { status: 404 });
    }
    maxSubmissions = form.maxSubmissions;
  }

  const parsed = parseRegistrationInput(input, { manual });
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const data = parsed.data;

  // Respuesta rápida; la garantía real es el índice único de `email`.
  const existing = await Registration.findOne({ email: data.email });
  if (existing) {
    return Response.json(
      { error: "Este correo ya está registrado en el evento" },
      { status: 409 },
    );
  }

  // Cruce con la lista de voluntarios: no se puede estar en las dos.
  // Sólo aplica al registro público — el staff sí puede inscribir a mano.
  if (!manual) {
    const cross = await checkAlreadyVolunteer(data.email);
    if (cross.blocked) {
      return Response.json({ error: cross.error }, { status: 409 });
    }
  }

  // El cupo se toma al final, ya sin motivo para rechazar: un 409 no gasta cupo.
  if (!(await reservarCupo("attendee", maxSubmissions))) {
    return Response.json({ error: "Se alcanzó el límite de registros" }, { status: 400 });
  }

  const qrCode = nanoid(12);

  // El índice único cierra la carrera entre el findOne y el create.
  let registration;
  try {
    registration = await Registration.create({
      ...data,
      qrCode,
      isManual: !!manual,
      ...(manual && initialCheckedIn ? {
        checkedIn: true,
        checkedInAt: new Date(),
        checkedInBy: actor?._id.toString() || null,
      } : {}),
    });
  } catch (e) {
    await devolverCupo("attendee", maxSubmissions);
    if ((e as { code?: number }).code === 11000) {
      return Response.json(
        { error: "Este correo ya está registrado en el evento" },
        { status: 409 },
      );
    }
    throw e;
  }

  if (manual) await sincronizarCupo("attendee");

  const name = `${data.firstName} ${data.lastName}`.trim();
  const email = data.email;

  // Auto-create Passport for new registration (shortId = qrCode for seamless reuse)
  if (generatePassport !== false && data.attendance !== "online") try {
    const viewPin = nuevoPin();
    const firstName = data.firstName || "Sin";
    const lastName = data.lastName || "Nombre";
    await Passport.updateOne(
      { shortId: qrCode },
      {
        $setOnInsert: {
          shortId: qrCode,
          role: "attendee",
          firstName,
          lastName,
          company: data.entityName ?? undefined,
          jobTitle: roleLabelOf(data.role, data.roleOther) || undefined,
          linkedRegistrationId: registration._id.toString(),
          isManual: false,
          viewPin,
        },
      },
      { upsert: true },
    );
  } catch { /* non-fatal — passport can be generated from admin later */ }

  // Skip email if: manual + skipEmail, or no email found
  const shouldSkipEmail = (manual && skipEmail) || !email;

  if (!shouldSkipEmail && email) {
    // Se responde ya: el correo sale después y deja su estado en el registro.
    const id = registration._id.toString();
    despuesDeResponder(() => enviarCorreoRegistro(id, name, email, data.attendance));
  } else {
    registration.emailStatus = "skipped";
    await registration.save();
  }

  if (manual && actor) {
    await createLog({
      userId: actor._id.toString(),
      userName: actor.name,
      userRole: actor.role,
      action: "REGISTRATION_MANUAL",
      target: name || email || qrCode,
      targetId: registration._id.toString(),
      details: initialCheckedIn ? "Con check-in" : "Sin check-in",
    });
  }

  return Response.json({ id: registration._id, qrCode }, { status: 201 });
});
