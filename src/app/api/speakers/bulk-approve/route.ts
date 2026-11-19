import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { sendEmail, conConcurrencia, EMAIL_FROM } from "@/lib/correo";
import { armarCorreo } from "@/lib/email-plantillas";
import { enlacesActuales, grupoDeSpeaker } from "@/lib/enlaces";
import { generateSpeakerPDF } from "@/lib/pdf/speaker";
import { tomarCerrojo, soltarCerrojo } from "@/models/email-cerrojo";
import { createLog } from "@/lib/log";
import { SLUG } from "@/config";
import { ruta } from "@/lib/api";

export const maxDuration = 300;

/** Resend admite ~2 peticiones por segundo: dos hilos con pausa de 1 s. */
const CONCURRENCIA = 2;
const PAUSA_MS = 1000;
const TOPE_IDS = 100;
/** Debe superar `maxDuration`: si la función muere sin soltarlo, caduca solo. */
const CADUCA_CERROJO_MS = 6 * 60_000;

export const POST = ruta(async (request: NextRequest) => {
  const user = await requireAccess("speakers", "editar", ["admin", "organizer"]);
  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

  if (!ids.length) return Response.json({ error: "Sin IDs" }, { status: 400 });
  if (ids.length > TOPE_IDS) {
    return Response.json({ error: `Máximo ${TOPE_IDS} por vez` }, { status: 400 });
  }

  await connectDB();

  // Dos aprobaciones a la vez mandarían la invitación dos veces al mismo speaker.
  const cerrojo = "speakers:aprobar";
  if (!(await tomarCerrojo(cerrojo, user.name ?? "", CADUCA_CERROJO_MS))) {
    return Response.json({ error: "Ya se está aprobando un lote. Espera a que termine." }, { status: 409 });
  }
  try {
  // Los enlaces se leen una vez para todo el lote, no por speaker.
  const { valores: enlaces } = await enlacesActuales();

  const results = await conConcurrencia(ids, CONCURRENCIA, async (id) => {
      // Un solo documento por speaker: estado y datos en el mismo sitio.
      const profile = await SpeakerProfile.findById(id);
      if (!profile || profile.status === "accepted") return { id, skipped: true };

      const name = profile.name ?? "";
      const email = profile.email ?? "";

      if (email) {
        /** El mismo correo que manda la aprobación de uno en uno. */
        const online = ["online", "virtual"].includes((profile.sessionType as string | undefined) ?? "");
        const correo = await armarCorreo(
          "speaker_aprobado",
          {
            nombre: name.split(" ")[0] ?? "",
            nombreCompleto: name,
            correo: email,
            charla: (profile.talkTitle as string | undefined) ?? "",
            modalidad: online ? "Track Online (en vivo)" : "Presencial",
            grupoWhatsapp: grupoDeSpeaker(enlaces, online),
          },
          [
            online ? "online" : "presencial",
            profile.speakerType === "international" ? "internacional" : "nacional",
          ],
        );
        if (!correo) throw new Error("plantilla speaker_aprobado no disponible");

        const pdfBuffer = await generateSpeakerPDF(name);
        const res = await sendEmail({
          from: EMAIL_FROM,
          to: email,
          clave: `speaker-aprobado:${id}`,
          subject: correo.asunto,
          html: correo.html,
          attachments: [{ filename: `invitacion-speaker-${SLUG}.pdf`, content: pdfBuffer.toString("base64") }],
        });
        // Sin correo no se aprueba: así sigue pendiente y el reintento lo procesa.
        if (res.error) throw new Error(res.error);
      }

      profile.status = "accepted";
      profile.approvedAt = new Date();
      profile.approvedBy = user._id.toString();
      profile.isPublic = true;
      await profile.save();

      await createLog({
        userId: user._id.toString(),
        userName: user.name,
        userRole: user.role,
        action: "SPEAKER_APPROVED",
        target: name || id,
        targetId: id,
        details: email || null,
      });

      return { id, approved: true };
    }, PAUSA_MS);

  const approved = results.filter(
    (r) => r.status === "fulfilled" && !(r.value as { skipped?: boolean }).skipped,
  ).length;
  const skipped = results.filter(
    (r) => r.status === "fulfilled" && (r.value as { skipped?: boolean }).skipped,
  ).length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return Response.json({ approved, skipped, failed });
  } finally {
    await soltarCerrojo(cerrojo).catch(() => {});
  }
});
