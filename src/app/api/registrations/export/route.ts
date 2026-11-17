import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Registration, type IRegistration } from "@/models/registration";
import {
  attendanceLabelOf,
  docTypeLabelOf,
  entityLabelOf,
  roleLabelOf,
} from "@/data/attendee-form";
import { csvResponse, csvRow } from "@/lib/csv";
import { SLUG } from "@/config";
import { ruta } from "@/lib/api";

/** Columnas de la persona, en orden fijo. */
const PERSON_COLUMNS: { label: string; value: (r: IRegistration) => string }[] = [
  { label: "Nombre", value: (r) => r.firstName },
  { label: "Apellido", value: (r) => r.lastName },
  { label: "Correo", value: (r) => r.email },
  { label: "Modalidad", value: (r) => attendanceLabelOf(r.attendance) },
  { label: "Tipo de documento", value: (r) => docTypeLabelOf(r.documentType) },
  { label: "Documento", value: (r) => r.documentNumber ?? "" },
  { label: "Rol", value: (r) => roleLabelOf(r.role, r.roleOther) },
  { label: "Tipo de entidad", value: (r) => entityLabelOf(r.entityType) },
  { label: "Entidad", value: (r) => r.entityName ?? "" },
  {
    label: "Aceptó código de conducta",
    value: (r) => (r.consent?.codeOfConduct ? r.consent.codeOfConduct.toISOString() : ""),
  },
  {
    label: "Autorizó datos",
    value: (r) => (r.consent?.privacy ? r.consent.privacy.toISOString() : ""),
  },
];

export const GET = ruta(async () => {
  await requireAccess("registrations", "ver", ["admin", "organizer"]);
  await connectDB();

  const registrations = await Registration.find({}).sort({ createdAt: 1 }).lean();

  // El formulario es fijo, así que el CSV tiene siempre las mismas columnas y en el mismo orden.

  const systemColumns = ["id", "qrCode", "checkedIn", "checkedInAt", "checkedInBy", "emailStatus", "emailError", "emailSentAt", "createdAt"];
  const allColumns = [...PERSON_COLUMNS.map((c) => c.label), ...systemColumns];

  const header = csvRow(allColumns);

  const rows = registrations.map((reg) =>
    csvRow([
      ...PERSON_COLUMNS.map((c) => c.value(reg)),
      String(reg._id),
      reg.qrCode,
      reg.checkedIn ? "Sí" : "No",
      reg.checkedInAt ? reg.checkedInAt.toISOString() : "",
      reg.checkedInBy ?? "",
      reg.emailStatus,
      reg.emailError ?? "",
      reg.emailSentAt ? reg.emailSentAt.toISOString() : "",
      reg.createdAt.toISOString(),
    ]),
  );

  const csv = [header, ...rows].join("\r\n");

  return csvResponse(csv, `registros-${SLUG}.csv`);
});
