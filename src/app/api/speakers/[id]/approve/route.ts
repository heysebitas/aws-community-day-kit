import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { armarCorreo } from "@/lib/email-plantillas";
import { enlacesActuales, grupoDeSpeaker } from "@/lib/enlaces";
import { generateSpeakerPDF } from "@/lib/pdf/speaker";
import { generateInternationalSpeakerPDF } from "@/lib/pdf/speaker-international";
import { createLog } from "@/lib/log";
import { subirTarjetaDeSpeaker } from "@/lib/speaker-card";
import { Setting } from "@/models/setting";
import { SITIO, SLUG } from "@/config";
import { ruta, logError } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = ruta(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireAccess("speakers", "editar", ["admin", "organizer"]);
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const speakerType = body.speakerType === "international" ? "international" : "local";
  const track = typeof body.track === "string" ? body.track : "general";

  await connectDB();

  const profile = await SpeakerProfile.findById(id);
  if (!profile) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (profile.status === "accepted") return Response.json({ error: "Ya fue aprobado" }, { status: 400 });

  profile.status = "accepted";
  profile.approvedAt = new Date();
  profile.approvedBy = user._id.toString();
  profile.speakerType = speakerType;
  profile.track = track;
  profile.isPublic = true;
  await profile.save();

  // La modalidad sale del tipo de sesión que eligió al postular.
  const detectedMode = ["online", "virtual"].includes((profile?.sessionType as string | undefined) ?? "")
    ? "online" : "in-person";
  const presentationMode: "in-person" | "online" =
    body.presentationMode === "online" ? "online"
    : body.presentationMode === "in-person" ? "in-person"
    : detectedMode;

  const online = presentationMode === "online";
  // El grupo sale de los enlaces del panel, no del código. Si no hay ninguno
  // configurado va vacío, y el correo sale sin el botón en lugar de con uno
  // que lleva al grupo de otro país.
  const { valores: enlaces } = await enlacesActuales();
  const group = grupoDeSpeaker(enlaces, online);

  const name = profile?.name ?? "";
  const email = profile?.email ?? "";
  const slug      = profile?.slug ?? "";
  const appUrl    = SITIO;
  const profileUrl = `${appUrl}/speakers/${slug}`;
  /**
   * La tarjeta se sube antes de escribir el correo, para que el enlace apunte
   * al PNG del bucket y no a la ruta que la genera al vuelo.
   */
  const subida = await subirTarjetaDeSpeaker(slug);
  const cardUrl = subida || (profile.cardImageUrl as string | undefined) || `${appUrl}/api/og/speaker/${slug}`;

  if (email) {
    /**
     * El contenido sale de la plantilla editable. Las condiciones —presencial u
     * online, del país o de fuera— viajan como banderas: una sola plantilla cubre
     * los cuatro casos.
     */
    const correo = await armarCorreo(
      "speaker_aprobado",
      {
        nombre: name.split(" ")[0] ?? "",
        nombreCompleto: name,
        correo: email,
        charla: (profile.talkTitle as string | undefined) ?? "",
        modalidad: online ? "Track Online (en vivo)" : "Presencial",
        grupoWhatsapp: group,
        perfil: profileUrl,
        tarjeta: cardUrl,
      },
      [
        online ? "online" : "presencial",
        speakerType === "international" ? "internacional" : "nacional",
      ],
    );
    if (!correo) {
      logError("speakers/[id]/approve", new Error("plantilla speaker_aprobado no disponible"));
      return Response.json({ error: "No se pudo armar el correo" }, { status: 500 });
    }
    const html = correo.html;

    // Always include the default PDF
    const defaultPdf = speakerType === "international"
      ? await generateInternationalSpeakerPDF(name)
      : await generateSpeakerPDF(name);

    const attachments: { filename: string; content: string }[] = [
      { filename: `invitacion-speaker-${SLUG}.pdf`, content: defaultPdf.toString("base64") },
    ];

    // Also attach the custom uploaded PDF if one exists
    const pdfKey = speakerType === "international" ? "pdf_international" : "pdf_local";
    const pdfSetting = await Setting.findOne({ key: pdfKey }).lean();
    if (pdfSetting?.value) {
      const res = await fetch(pdfSetting.value as string);
      if (res.ok) {
        const customBuffer = Buffer.from(await res.arrayBuffer());
        attachments.push({ filename: "informacion-adicional-speaker.pdf", content: customBuffer.toString("base64") });
      }
    }

    await sendEmail({
      from: EMAIL_FROM,
      to: email,
      subject: correo.asunto,
      html,
      attachments,
    });
  }

  await createLog({
    action: "SPEAKER_APPROVED",
    target: name || id,
    targetId: id,
    details: `${speakerType} · ${email}${subida ? "" : " · la tarjeta no se pudo subir"}`,
  });

  // `tarjetaSubida` lo usa el panel para avisar si hay que subirla a mano.
  return Response.json({ ok: true, slug, tarjetaSubida: !!subida });
}, { etiqueta: "[approve]" });
