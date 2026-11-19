import QRCode from "qrcode";
import { EVENTO } from "@/config";
import { armarCorreo } from "@/lib/email-plantillas";
import { generateRegistrationPDF } from "@/lib/pdf/registration";
import { CacheImagenes } from "@/lib/cache-imagen";
import type { Attendance } from "@/models/registration";

/**
 * El correo de confirmación de un registro. Lo mandan el registro nuevo y el
 * reenvío desde el panel, y por eso vive en un solo sitio.
 *
 * A quien va en persona le llega su pase en PDF con el QR; a quien sigue la
 * transmisión no, porque no hay puerta donde escanearlo.
 */

export type BuiltEmail = {
  subject: string;
  html: string;
  attachments: { filename: string; content: string }[];
  isVirtual: boolean;
};

/** Cambia al tocar el diseño del pase: invalida los PDF ya guardados. */
const VERSION_PASE = "1";
/** Los pases ya dibujados: un reenvío o un reintento no vuelve a pagar el PDF. */
export const pasesPdf = new CacheImagenes(200, 32 * 1024 * 1024);

export async function buildRegistrationEmail(name: string, qrCode: string, attendance: Attendance): Promise<BuiltEmail> {
  const isVirtual = attendance === "online";
  const datos = { nombre: name.trim().split(/\s+/)[0] ?? "", nombreCompleto: name };

  if (isVirtual) {
    const correo = await armarCorreo("registro_online", datos, ["online"]);
    if (!correo) throw new Error("plantilla registro_online no disponible");
    return { subject: correo.asunto, html: correo.html, attachments: [], isVirtual: true };
  }

  // El nombre va en la clave: si lo corrigen, el PDF es otro.
  const pdfBuffer = await pasesPdf.obtener(`${VERSION_PASE}|${qrCode}|${name.trim()}`, async () => {
    const qrBuffer = await QRCode.toBuffer(qrCode, {
      type: "png",
      width: 400,
      margin: 2,
      color: { dark: "#111111", light: "#FFFFFF" },
    });
    return new Response(new Uint8Array(await generateRegistrationPDF(name, qrBuffer, qrCode)));
  });

  const correo = await armarCorreo("registro_presencial", datos, ["presencial"]);
  if (!correo) throw new Error("plantilla registro_presencial no disponible");

  return {
    subject: correo.asunto,
    html: correo.html,
    attachments: [{ filename: `pase-${EVENTO.siglas.toLowerCase()}.pdf`, content: pdfBuffer.toString("base64") }],
    isVirtual: false,
  };
}
