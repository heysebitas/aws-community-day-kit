import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/components";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { generateVolunteerCertificate } from "@/lib/pdf/certificate";
import { VolunteerCertificateEmail } from "@/emails/volunteer-certificate";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { SLUG, EVENTO } from "@/config";
import { ruta } from "@/lib/api";
import { leerCuerpo, textoDe } from "@/lib/cuerpo";

// Envío de PRUEBA: el certificado del voluntario elegido al correo que se indique.
// No marca certSentAt (es solo para verificar el adjunto y el diseño).
export const POST = ruta(async (req: NextRequest) => {
  await requireAuth(["admin"]);
  const cuerpo = await leerCuerpo(req);
  const id = textoDe(cuerpo, "id");
  const email = textoDe(cuerpo, "email", 254);
  if (!id || !email || !email.includes("@")) {
    return NextResponse.json({ error: "id y email válidos son requeridos" }, { status: 400 });
  }
  await connectDB();

  const vol = await VolunteerSubmission.findById(id).select("firstName lastName certName").lean();
  if (!vol) return NextResponse.json({ error: "Voluntario no encontrado" }, { status: 404 });

  const name = (vol.certName || `${vol.firstName} ${vol.lastName}` || "Volunteer").trim();

  const pdf = await generateVolunteerCertificate(name);
  const html = await render(VolunteerCertificateEmail({ name }));
  const res = await sendEmail({
    from: EMAIL_FROM,
    to: email.trim(),
    subject: `[PRUEBA] Tu certificado de voluntariado — ${EVENTO.nombreCompleto}`,
    html,
    attachments: [{ filename: `certificado-${SLUG}.pdf`, content: pdf.toString("base64") }],
  });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 502 });

  return NextResponse.json({ ok: true });
});
