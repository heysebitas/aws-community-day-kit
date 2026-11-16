import { createHmac } from "node:crypto";
import { SITIO } from "@/config";
import { SpeakerProfile } from "@/models/speaker-profile";
import { uploadBuffer, s3Key } from "@/lib/s3";

/**
 * Con esto la aplicación se identifica ante su propia ruta de tarjetas, que no
 * sirve a desconocidos las de propuestas sin aceptar.
 */
export function firmaInterna(slug: string): string {
  return createHmac("sha256", process.env.JWT_SECRET ?? "").update(`tarjeta:${slug}`).digest("hex");
}

/**
 * Dibuja la tarjeta de un speaker y la deja en el bucket.
 *
 * La imagen se pide por HTTP a la propia aplicación, así la ruta que la genera
 * es el único sitio que sabe armarla. Devuelve la URL pública o `null` si algo
 * falló; nunca lanza, porque quien llama decide si eso es grave.
 */
export async function subirTarjetaDeSpeaker(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${SITIO}/api/og/speaker/${encodeURIComponent(slug)}?preview=1`, {
      headers: { "x-firma": firmaInterna(slug) },
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    // Siempre el mismo nombre: la tarjeta nueva pisa a la anterior.
    const cardImageUrl = await uploadBuffer(s3Key(`speaker-cards/${slug}.png`), buffer, "image/png");

    await SpeakerProfile.updateOne({ slug }, { cardApproved: true, cardImageUrl });
    return cardImageUrl;
  } catch {
    return null;
  }
}
