import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { SurveyRecipient } from "@/models/survey-recipient";
import { ruta } from "@/lib/api";

// Seguimiento de la encuesta: quién recibió el correo y quién dio clic (abrió la encuesta).
export const GET = ruta(async () => {
  await requireAuth(["admin"]);
  await connectDB();

  const docs = await SurveyRecipient.find({})
    .select("name roleLabel clickedAt clickCount lastSentAt")
    .sort({ clickedAt: -1, name: 1 })
    .lean<{ name: string; roleLabel: string; clickedAt: Date | null; clickCount: number; lastSentAt: Date | null }[]>();

  const sent = docs.length;
  const clicked = docs.filter((d) => d.clickedAt).length;

  return Response.json({
    sent,
    clicked,
    list: docs.map((d) => ({
      name: d.name || "(sin nombre)",
      roleLabel: d.roleLabel || "Asistente",
      clicked: !!d.clickedAt,
      clickedAt: d.clickedAt,
    })),
  });
});
