import { MensajesDeRuta } from "@/components/providers/mensajes-de-ruta";
import type { Metadata } from "next";
import { metadatosDe } from "@/lib/metadatos";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return metadatosDe(locale, "/speakers", "speakers");
}

export default function SpeakersLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  return (
    <>
      <link rel="preconnect" href="https://challenges.cloudflare.com" crossOrigin="" />
      <MensajesDeRuta ruta="speakers" params={params}>{children}</MensajesDeRuta>
    </>
  );
}
