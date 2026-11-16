import { MensajesDeRuta } from "@/components/providers/mensajes-de-ruta";
import AdminShell from "./_shell";

export default function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  return (
    <MensajesDeRuta ruta="admin" params={params}>
      <AdminShell>{children}</AdminShell>
    </MensajesDeRuta>
  );
}
