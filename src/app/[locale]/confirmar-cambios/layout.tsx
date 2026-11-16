import { MensajesDeRuta } from "@/components/providers/mensajes-de-ruta";

export default function ConfirmarCambiosLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  return <MensajesDeRuta ruta="confirmar-cambios" params={params}>{children}</MensajesDeRuta>;
}
