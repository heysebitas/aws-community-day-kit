import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { createLog } from "@/lib/log";
import { sendEmail, MARKETING_EMAIL_FROM } from "@/lib/correo";
import { armarCorreo } from "@/lib/email-plantillas";
import type { ProfileStatus } from "@/models/speaker-profile";

/** La marca que impide que la campaña en masa vuelva a escribirle. */
const CAMPANA_RECHAZO = "speaker_rejection";

export const dynamic = "force-dynamic";

const ALLOWED: ProfileStatus[] = ["submitted", "reviewing", "waitlisted", "rejected"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try { await requireAccess("speakers", "editar", ["admin", "organizer"]); }
  catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    return Response.json({ error: msg }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await request.json() as { status: ProfileStatus };

  if (!ALLOWED.includes(status)) {
    return Response.json({ error: "Status inválido. Usa el endpoint /approve para aceptar." }, { status: 400 });
  }

  await connectDB();
  const profile = await SpeakerProfile.findById(id);
  if (!profile) return Response.json({ error: "No encontrado" }, { status: 404 });

  profile.status = status;
  await profile.save();

  const name = profile.name ?? "";

  /** El aviso de que no entró, al rechazar. */
  let correoEnviado: boolean | null = null;
  const yaAvisado = (profile.sentSpeakerCampaigns ?? []).includes(CAMPANA_RECHAZO);

  if (status === "rejected" && profile.email && !yaAvisado) {
    try {
      // El contenido sale de la plantilla editable, no de un TSX: lo que se
      // escriba en /admin/correos es lo que se envía.
      const correo = await armarCorreo("speaker_rechazado", {
        nombre: name.split(" ")[0] ?? "",
        nombreCompleto: name,
        correo: profile.email,
        charla: profile.talkTitle ?? "",
      });
      if (!correo) throw new Error("plantilla speaker_rechazado no disponible");

      const { error } = await sendEmail({
        from: MARKETING_EMAIL_FROM,
        to: profile.email,
        subject: correo.asunto,
        html: correo.html,
      });
      correoEnviado = !error;
      if (!error) {
        profile.sentSpeakerCampaigns = [...(profile.sentSpeakerCampaigns ?? []), CAMPANA_RECHAZO];
        await profile.save();
      }
    } catch {
      // El cambio de estado ya está hecho y no se deshace: que un fallo del
      // correo impida mover la propuesta sería peor. Se avisa y ya.
      correoEnviado = false;
    }
  }

  await createLog({
    action: "SPEAKER_STATUS_CHANGED",
    target: name || id,
    targetId: id,
    details: correoEnviado === null ? status : `${status} · correo ${correoEnviado ? "enviado" : "NO enviado"}`,
  });

  return Response.json({ ok: true, status, correoEnviado, yaAvisado });
}
