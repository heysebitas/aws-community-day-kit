import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { generateVolunteerCertificate } from "@/lib/pdf/certificate";
import { armarCorreoObligatorio } from "@/lib/email-plantillas";
import { sendEmail, sleep, EMAIL_FROM } from "@/lib/correo";
import { tomarCerrojo, soltarCerrojo } from "@/models/email-cerrojo";
import { createLog } from "@/lib/log";
import { SLUG } from "@/config";
import { ruta } from "@/lib/api";
import { leerCuerpo, listaDeTextos } from "@/lib/cuerpo";

export const maxDuration = 300;

/** 100 × ~1 s entra en `maxDuration`. */
const TOPE_IDS = 100;
/** Debe superar `maxDuration`: si la función muere sin soltarlo, caduca solo. */
const CADUCA_CERROJO_MS = 6 * 60_000;

// Envía el certificado (PDF adjunto) a los voluntarios seleccionados (1 o varios).
export const POST = ruta(async (req: NextRequest) => {
  const actor = await requireAuth(["admin"]);
  const ids = listaDeTextos((await leerCuerpo(req)).ids);
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids requerido" }, { status: 400 });
  }
  if (ids.length > TOPE_IDS) {
    return NextResponse.json({ error: `Máximo ${TOPE_IDS} por envío` }, { status: 400 });
  }
  await connectDB();

  // Dos envíos a la vez mandarían el certificado dos veces a la misma persona.
  const cerrojo = "certificados";
  if (!(await tomarCerrojo(cerrojo, actor.name ?? "", CADUCA_CERROJO_MS))) {
    return NextResponse.json({ error: "Ya se están enviando certificados. Espera a que termine." }, { status: 409 });
  }
  try {
  const vols = await VolunteerSubmission.find({ _id: { $in: ids }, approved: true })
    .select("firstName lastName email certName certSentAt")
    .lean();

  // Envío individual (el batch de Resend NO soporta adjuntos) con marcado
  // exacto: solo se marca certSentAt a quienes de verdad les salió el correo.
  let sentCount = 0, failedCount = 0, skipped = 0;

  for (const v of vols) {
    const email = v.email;
    const name = (v.certName || `${v.firstName} ${v.lastName}`).trim();
    if (!email || !name || v.certSentAt) { skipped++; continue; }

    const pdf = await generateVolunteerCertificate(name);
    const correo = await armarCorreoObligatorio("voluntario_certificado", { nombre: name.split(" ")[0]!, nombreCompleto: name });
    const res = await sendEmail({
      from: EMAIL_FROM,
      to: email,
      clave: `certificado:${v._id}`,
      subject: correo.asunto,
      html: correo.html,
      attachments: [{ filename: `certificado-${SLUG}.pdf`, content: pdf.toString("base64") }],
    });
    if (res.error) { failedCount++; } else {
      sentCount++;
      // Uno a uno: si la petición se corta, ya quedó marcado a quien salió.
      await VolunteerSubmission.updateOne({ _id: v._id }, { $set: { certSentAt: new Date() } });
    }
    await sleep(550); // rate limit de Resend (~2 req/s)
  }

  await createLog({
    userId: String(actor._id), userName: actor.name, userRole: actor.role,
    action: "CERT_SENT",
    target: sentCount === 1 ? "1 certificado" : `${sentCount} certificados`,
    details: `${sentCount} enviados${failedCount ? `, ${failedCount} fallidos` : ""}${skipped ? `, ${skipped} sin correo/nombre` : ""}`,
  });

  return NextResponse.json({ sentCount, failedCount, skipped });
  } finally {
    await soltarCerrojo(cerrojo).catch(() => {});
  }
});
