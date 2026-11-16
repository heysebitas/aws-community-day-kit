import { MensajesDeRuta } from "@/components/providers/mensajes-de-ruta";
import type { Metadata } from "next";
import { metadatosDe } from "@/lib/metadatos";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return metadatosDe(locale, "/directorio", "directorio");
}

export default function DirectorioLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  return <MensajesDeRuta ruta="directorio" params={params}>{children}</MensajesDeRuta>;
}
