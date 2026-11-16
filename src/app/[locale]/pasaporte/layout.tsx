import { MensajesDeRuta } from "@/components/providers/mensajes-de-ruta";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PassaporteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  return <MensajesDeRuta ruta="pasaporte" params={params}>{children}</MensajesDeRuta>;
}
