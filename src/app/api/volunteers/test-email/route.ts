import { NextRequest } from "next/server";
import { SLUG } from "@/config";
import { requireAuth } from "@/lib/auth";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { connectDB } from "@/lib/db";
import { armarCorreo } from "@/lib/email-plantillas";
import { generateVolunteerPDF } from "@/lib/pdf/volunteer";
import { ruta } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";

export const dynamic = "force-dynamic";

/** Manda una prueba del correo de aprobación de voluntarios: la misma plantilla que sale al aprobar. */
export const POST = ruta(async (request: NextRequest) => {
  await requireAuth(["admin"]);

  const body = await leerCuerpo(request);
  const to = typeof body.to === "string" && body.to.includes("@") ? body.to : null;
  if (!to) return Response.json({ error: "Email destino requerido" }, { status: 400 });
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "Voluntario de Prueba";

  await connectDB();
  const correo = await armarCorreo("voluntario_aprobado", { nombre: name.split(" ")[0], nombreCompleto: name, correo: to });
  if (!correo) return Response.json({ error: "La plantilla está desactivada" }, { status: 409 });

  const pdf = await generateVolunteerPDF(name);
  const res = await sendEmail({
    from: EMAIL_FROM,
    to,
    subject: `[PRUEBA] ${correo.asunto}`,
    html: correo.html,
    attachments: [{ filename: `invitacion-voluntario-${SLUG}.pdf`, content: pdf.toString("base64") }],
  });
  if (res.error) return Response.json({ error: res.error }, { status: 502 });

  return Response.json({ ok: true });
});
