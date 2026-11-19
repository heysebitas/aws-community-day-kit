import { NextRequest } from "next/server";
import { AuthError, requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { armarCorreo } from "@/lib/email-plantillas";
import { generateSpeakerPDF } from "@/lib/pdf/speaker";
import { generateInternationalSpeakerPDF } from "@/lib/pdf/speaker-international";
import { Setting } from "@/models/setting";
import { SITIO, SLUG } from "@/config";
import { ruta, logError } from "@/lib/api";
import { leerCuerpo } from "@/lib/cuerpo";

export const dynamic = "force-dynamic";

export const POST = ruta(async (request: NextRequest) => {
  try {
    await requireAuth(["admin"]);
    await connectDB();

    const body = await leerCuerpo(request);
    const to = typeof body.to === "string" && body.to.includes("@") ? body.to : null;
    if (!to) return Response.json({ error: "Email destino requerido" }, { status: 400 });
    const speakerType = body.speakerType === "international" ? "international" : "local";

    const appUrl = SITIO;
    const profileUrl = `${appUrl}/speakers/speaker-ejemplo`;
    const cardUrl    = `${appUrl}/api/og/speaker/speaker-ejemplo`;

    // La plantilla editable, para que la prueba enseñe lo que se va a mandar
    // de verdad y no una copia que se queda atrás en cuanto alguien edita.
    const correo = await armarCorreo(
      "speaker_aprobado",
      {
        nombre: "Speaker",
        nombreCompleto: "Speaker de Prueba",
        correo: to,
        charla: "Título de ejemplo de una charla",
        modalidad: "Presencial",
        perfil: profileUrl,
        tarjeta: cardUrl,
      },
      ["presencial", speakerType === "international" ? "internacional" : "nacional"],
    );
    if (!correo) return Response.json({ error: "La plantilla no está disponible" }, { status: 500 });

    // Use custom PDF from S3 if uploaded, else generate
    let pdfBuffer: Buffer;
    const pdfKey = speakerType === "international" ? "pdf_international" : "pdf_local";
    const pdfSetting = await Setting.findOne({ key: pdfKey }).lean();

    if (pdfSetting?.value) {
      const res = await fetch(pdfSetting.value);
      if (!res.ok) throw new Error("No se pudo descargar el PDF desde S3");
      pdfBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      pdfBuffer = speakerType === "international"
        ? await generateInternationalSpeakerPDF("Speaker de Prueba")
        : await generateSpeakerPDF("Speaker de Prueba");
    }

    await sendEmail({
      from: EMAIL_FROM,
      to,
      subject: `[PRUEBA] ${correo.asunto}`,
      html: correo.html,
      attachments: [{ filename: `invitacion-speaker-${SLUG}.pdf`, content: pdfBuffer.toString("base64") }],
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) throw e;
    logError("[test-email]", e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
});
