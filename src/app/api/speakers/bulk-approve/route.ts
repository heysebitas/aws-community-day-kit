import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { armarCorreo } from "@/lib/email-plantillas";
import { enlacesActuales, grupoDeSpeaker } from "@/lib/enlaces";
import { generateSpeakerPDF } from "@/lib/pdf/speaker";
import { createLog } from "@/lib/log";
import { SLUG } from "@/config";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAccess("speakers", "editar", ["admin", "organizer"]);
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];

    if (!ids.length) return Response.json({ error: "Sin IDs" }, { status: 400 });

    await connectDB();

    // Los enlaces se leen una vez para todo el lote, no por speaker.
    const { valores: enlaces } = await enlacesActuales();

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        // Un solo documento por speaker: estado y datos en el mismo sitio.
        const profile = await SpeakerProfile.findById(id);
        if (!profile || profile.status === "accepted") return { id, skipped: true };

        profile.status = "accepted";
        profile.approvedAt = new Date();
        profile.approvedBy = user._id.toString();
        profile.isPublic = true;
        await profile.save();

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
          await sendEmail({
            from: EMAIL_FROM,
            to: email,
            subject: correo.asunto,
            html: correo.html,
            attachments: [{ filename: `invitacion-speaker-${SLUG}.pdf`, content: pdfBuffer.toString("base64") }],
          });
        }

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
      }),
    );

    const approved = results.filter(
      (r) => r.status === "fulfilled" && !(r.value as { skipped?: boolean }).skipped,
    ).length;
    const skipped = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { skipped?: boolean }).skipped,
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return Response.json({ approved, skipped, failed });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
