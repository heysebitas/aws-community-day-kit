import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { ruta } from "@/lib/api";

// Lista de voluntarios aprobados para certificados (nombre efectivo + estado de envío).
export const GET = ruta(async () => {
  await requireAuth(["admin"]);
  await connectDB();

  const vols = await VolunteerSubmission.find({ approved: true })
    .select("firstName lastName email certName certSentAt")
    .lean();

  const list = vols.map((v) => {
    const rawName = `${v.firstName} ${v.lastName}`.trim();
    return {
      id: String(v._id),
      // `certName` es el override manual: si está, manda sobre el del registro.
      name: (v.certName || rawName).trim(),
      rawName,
      email: v.email,
      certSentAt: v.certSentAt ?? null,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  return Response.json({ volunteers: list });
});
