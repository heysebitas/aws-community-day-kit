import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SurveyRecipient } from "@/models/survey-recipient";
import { enlacesActuales } from "@/lib/enlaces";
import { SEMILLA_ENLACES } from "@/data/enlaces";

export const dynamic = "force-dynamic";

/** Registra el clic del destinatario y lo lleva a la encuesta de AWS. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  let destino = SEMILLA_ENLACES.encuestaPulse!;

  try {
    const { token } = await params;
    await connectDB();

    const { valores } = await enlacesActuales();
    if (valores.encuestaPulse) destino = valores.encuestaPulse;

    if (token) {
      // clickCount siempre suma; clickedAt se fija solo en el PRIMER clic.
      // Updates planos (sin pipeline ni $$NOW) para que Mongoose los aplique seguro.
      await SurveyRecipient.updateOne({ token }, { $inc: { clickCount: 1 } });
      await SurveyRecipient.updateOne({ token, clickedAt: null }, { $set: { clickedAt: new Date() } });
    }
  } catch { /* el tracking nunca rompe la redirección */ }

  return NextResponse.redirect(destino, 302);
}
