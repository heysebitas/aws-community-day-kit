import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { Registration, type IRegistration } from "@/models/registration";
import {
  attendanceLabelOf,
  docTypeLabelOf,
  entityLabelOf,
  roleLabelOf,
} from "@/data/attendee-form";
import { SLUG } from "@/config";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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

export async function GET() {
  try {
    await requireAccess("registrations", "ver", ["admin", "organizer"]);
    await connectDB();

    const registrations = await Registration.find({}).sort({ createdAt: 1 }).lean();

    // El formulario es fijo, así que el CSV tiene siempre las mismas columnas y en el mismo orden.

    const systemColumns = ["id", "qrCode", "checkedIn", "checkedInAt", "checkedInBy", "emailStatus", "emailError", "emailSentAt", "createdAt"];
    const allColumns = [...PERSON_COLUMNS.map((c) => c.label), ...systemColumns];

    const header = allColumns.map(escapeCsv).join(",");

    const rows = registrations.map((reg) => {
      const responsePart = PERSON_COLUMNS.map((c) => escapeCsv(c.value(reg)));
      const systemPart = [
        escapeCsv(String(reg._id)),
        escapeCsv(reg.qrCode),
        escapeCsv(reg.checkedIn ? "Sí" : "No"),
        escapeCsv(reg.checkedInAt ? reg.checkedInAt.toISOString() : ""),
        escapeCsv(reg.checkedInBy ?? ""),
        escapeCsv(reg.emailStatus),
        escapeCsv(reg.emailError ?? ""),
        escapeCsv(reg.emailSentAt ? reg.emailSentAt.toISOString() : ""),
        escapeCsv(reg.createdAt.toISOString()),
      ];
      return [...responsePart, ...systemPart].join(",");
    });

    const csv = [header, ...rows].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registros-${SLUG}.csv"`,
      },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Unauthorized") return Response.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return Response.json({ error: msg }, { status: 403 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
