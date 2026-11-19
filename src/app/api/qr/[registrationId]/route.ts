import QRCode from "qrcode";
import { connectDB } from "@/lib/db";
import { requireAnyAccess } from "@/lib/auth";
import { Registration } from "@/models/registration";
import { TEMA } from "@/config";
import { ruta } from "@/lib/api";

export const GET = ruta(async (
  _request: Request,
  { params }: { params: Promise<{ registrationId: string }> },
) => {
  await requireAnyAccess(["registrations", "print", "checkin"], "ver", ["admin", "organizer"]);
  const { registrationId } = await params;

  await connectDB();
  const registration = await Registration.findById(registrationId);

  if (!registration) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  const qrBuffer = await QRCode.toBuffer(registration.qrCode, {
    type: "png",
    width: 300,
    margin: 2,
    color: { dark: TEMA.acento, light: "#0A0A0F" },
  });

  return new Response(new Uint8Array(qrBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
