import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import {
  docTypeLabelOf,
  entityLabelOf,
  roleLabelOf,
} from "@/data/attendee-form";
import {
  availabilityLabelOf,
  dietaryLabelOf,
  experienceLabelOf,
  interestAreasLabelOf,
  sbgLabelOf,
  shirtSizeLabelOf,
} from "@/data/volunteer-form";
import { csvResponse, csvRow } from "@/lib/csv";
import { SLUG } from "@/config";

/** Exportación de voluntarios a CSV. */

const COLUMNS = [
  "Nombre", "Apellido", "Correo electrónico", "Teléfono",
  "Tipo de documento", "Número de documento",
  "Rol", "Tipo de entidad", "Entidad", "Student Builder Group",
  "Disponibilidad", "Áreas de interés", "Experiencia previa", "Motivación",
  "Talla", "Alimentación",
  "Contacto de emergencia", "Teléfono de emergencia",
  "Aprobado", "Aprobado en", "Certificado enviado", "Enviado en", "ID",
];

export async function GET() {
  try {
    await requireAccess("volunteers", "ver", ["admin", "organizer"]);
    await connectDB();

    const submissions = await VolunteerSubmission.find({}).sort({ submittedAt: 1 }).lean();

    const rows = submissions.map((v) =>
      csvRow([
        v.firstName,
        v.lastName,
        v.email,
        v.phone,
        docTypeLabelOf(v.documentType),
        v.documentNumber,
        roleLabelOf(v.role, v.roleOther),
        entityLabelOf(v.entityType),
        v.entityName ?? "",
        sbgLabelOf(v.sbg),
        availabilityLabelOf(v.availability),
        interestAreasLabelOf(v.interestAreas ?? []),
        experienceLabelOf(v.previousExperience),
        v.motivation,
        shirtSizeLabelOf(v.shirtSize),
        dietaryLabelOf(v.dietary, v.dietaryOther),
        v.emergencyName,
        v.emergencyPhone,
        v.approved ? "Sí" : "No",
        v.approvedAt ? v.approvedAt.toISOString() : "",
        v.certSentAt ? v.certSentAt.toISOString() : "",
        v.submittedAt ? v.submittedAt.toISOString() : "",
        String(v._id),
      ]),
    );

    const csv = [csvRow(COLUMNS), ...rows].join("\r\n");

    return csvResponse(csv, `voluntarios-${SLUG}.csv`);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
