import { MensajesDeRuta } from "@/components/providers/mensajes-de-ruta";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function ConfirmarLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  return <MensajesDeRuta ruta="confirmar" params={params}>{children}</MensajesDeRuta>;
}
