import QRCode from "qrcode";
import { EVENTO, SITIO } from "@/config";
import { armarCorreo } from "@/lib/email-plantillas";
import { generateRegistrationPDF } from "@/lib/pdf/registration";
import { CacheImagenes } from "@/lib/cache-imagen";
import { Registration, type Attendance } from "@/models/registration";
import { Passport } from "@/models/passport";

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

/** El enlace y el PIN del pasaporte de quien tiene este pase; vacío si aún no tiene. */
async function pasaporteDe(qrCode: string): Promise<Record<string, string>> {
  const reg = await Registration.findOne({ qrCode }).select("_id").lean();
  if (!reg) return {};
  const p = await Passport.findOne({ linkedRegistrationId: String(reg._id) }).select("shortId viewPin").lean<{ shortId: string; viewPin?: string } | null>();
  if (!p) return {};
  return { pasaporte: `${SITIO}/pasaporte/${p.shortId}`, pin: p.viewPin ?? "" };
}

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

  // El PIN no va en la escarapela: sale por aquí, junto al enlace del pasaporte.
  const propio = await pasaporteDe(qrCode);
  const correo = await armarCorreo("registro_presencial", { ...datos, ...propio }, ["presencial"]);
  if (!correo) throw new Error("plantilla registro_presencial no disponible");

  return {
    subject: correo.asunto,
    html: correo.html,
    attachments: [{ filename: `pase-${EVENTO.siglas.toLowerCase()}.pdf`, content: pdfBuffer.toString("base64") }],
    isVirtual: false,
  };
}
