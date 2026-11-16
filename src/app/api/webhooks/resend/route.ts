import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/registration";
import { EmailEnvio, type EstadoEnvio } from "@/models/email-envio";

/** Lo que Resend nos cuenta de cada correo. */

/** Qué estado deja cada evento. Lo que no esté acá no nos dice nada nuevo. */
const POR_EVENTO: Record<string, { envio: EstadoEnvio; motivo: string | null }> = {
  "email.delivered": { envio: "entregado", motivo: null },
  "email.bounced": { envio: "rebotado", motivo: "Rebotó" },
  "email.complained": { envio: "queja", motivo: "Marcado como spam" },
};

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let event: { type: string; data: { email_id: string } };
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(payload, headers) as typeof event;
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { type, data } = event;
  const resendId = data?.email_id;
  if (!resendId) return Response.json({ ok: true });

  const mapeo = POR_EVENTO[type];
  if (!mapeo) return Response.json({ ok: true });

  await connectDB();

  /** El registro del asistente guarda sólo dos estados, los de siempre. */
  const emailStatus = mapeo.envio === "entregado" ? "sent" : "failed";

  await Promise.all([
    Registration.updateMany({ resendId }, { emailStatus, emailError: mapeo.motivo }),
    /** Un `entregado` nunca pisa un `rebotado`. */
    EmailEnvio.updateMany(
      {
        resendId,
        ...(mapeo.envio === "entregado" ? { estado: { $nin: ["rebotado", "queja"] } } : {}),
      },
      { estado: mapeo.envio, motivo: mapeo.motivo },
    ),
  ]);

  return Response.json({ ok: true });
}
