import { ruta, logError } from "@/lib/api";
import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/registration";
import { generateRegistrationPDF } from "@/lib/pdf/registration";
import { EVENTO } from "@/config";
import { getIp, rateLimit } from "@/lib/rate-limit";

export const GET = ruta(async (
  _request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> },
) => {
  try {
    const limite = rateLimit(`pase-pdf:${getIp(_request)}`, 300, 10 * 60 * 1000);
    if (!limite.ok) {
      return Response.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
      );
    }

    const { qrCode } = await params;
    const porCodigo = rateLimit(`pase-pdf:codigo:${qrCode}`, 5, 10 * 60 * 1000);
    if (!porCodigo.ok) {
      return Response.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(porCodigo.retryAfterMs / 1000)) } },
      );
    }
    await connectDB();

    const registration = await Registration.findOne({ qrCode });
    if (!registration) {
      return Response.json({ error: "No encontrado" }, { status: 404 });
    }

    const name = `${registration.firstName} ${registration.lastName}`.trim();

    const qrBuffer = await QRCode.toBuffer(registration.qrCode, {
      type: "png",
      width: 300,
      margin: 2,
      color: { dark: "#111111", light: "#FFFFFF" },
    });

    const pdf = await generateRegistrationPDF(name, qrBuffer, registration.qrCode);

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="pase-${EVENTO.siglas.toLowerCase()}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    logError("passes/[qrCode] GET", e);
    return Response.json({ code: "error_interno", error: "Error interno" }, { status: 500 });
  }
}, { etiqueta: "passes/[qrCode] GET" });
