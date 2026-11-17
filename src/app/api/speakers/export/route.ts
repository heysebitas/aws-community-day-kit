import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { csvResponse, csvRow } from "@/lib/csv";
import { SLUG } from "@/config";
import { ruta } from "@/lib/api";

/** Exportación de postulaciones de speaker a CSV. */

const STATUS_LABELS: Record<string, string> = {
  submitted: "Recibida",
  reviewing: "En revisión",
  accepted: "Aceptada",
  rejected: "Rechazada",
  waitlisted: "En lista de espera",
  scheduled: "Agendada",
};

const COLUMNS = [
  "Nombre", "Apellido", "Correo electrónico", "Teléfono", "Ciudad y país",
  "Cargo", "Empresa", "Primera vez como speaker",
  "Título de la charla", "Resumen", "Tipo de sesión", "Nivel", "Idioma",
  "Requerimientos", "Co-speakers",
  "LinkedIn", "GitHub", "Builder Center", "Sitio web",
  "Estado", "Aprobado", "Aprobado en", "Aprobado por", "Enviado en", "ID",
];

export const GET = ruta(async () => {
  await requireAccess("speakers", "ver", ["admin", "organizer"]);
  await connectDB();

  // Un documento por speaker: los datos y el estado del trámite juntos.
  const speakers = await SpeakerProfile.find({}).sort({ submittedAt: 1 }).lean();

  const rows = speakers.map((p) => {
    const sub = p;
    const coSpeakers = (p?.coSpeakers ?? [])
      .map((c) => `${c.firstName} ${c.lastName}`.trim())
      .filter(Boolean)
      .join(" · ");

    return csvRow([
      p?.firstName ?? "",
      p?.lastName ?? "",
      p?.email ?? "",
      p?.phone ?? "",
      p?.countryCity ?? "",
      p?.role ?? "",
      p?.company ?? "",
      p?.firstTimeSpeaker ? "Sí" : "No",
      p?.talkTitle ?? "",
      p?.talkAbstract ?? "",
      p?.sessionType ?? "",
      p?.audienceLevel ?? "",
      p?.language ?? "",
      p?.requirements ?? "",
      coSpeakers,
      p?.social?.linkedin ?? "",
      p?.social?.github ?? "",
      p?.social?.builderCenter ?? "",
      p?.social?.website ?? "",
      STATUS_LABELS[sub.status] ?? sub.status,
      sub.status === "accepted" ? "Sí" : "No",
      sub.approvedAt ? sub.approvedAt.toISOString() : "",
      sub.approvedBy ?? "",
      sub.submittedAt ? sub.submittedAt.toISOString() : "",
      String(sub._id),
    ]);
  });

  const csv = [csvRow(COLUMNS), ...rows].join("\r\n");

  return csvResponse(csv, `speakers-${SLUG}.csv`);
});
