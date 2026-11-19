import { MensajesDeRuta } from "@/components/providers/mensajes-de-ruta";
import { leerUsuarioInicial } from "@/lib/lectores";
import AdminShell from "./_shell";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  // La sesión se lee aquí para que el primer pintado no espere a /api/auth/me.
  const usuario = await leerUsuarioInicial();
  return (
    <MensajesDeRuta ruta="admin" params={params}>
      <AdminShell usuarioInicial={usuario}>{children}</AdminShell>
    </MensajesDeRuta>
  );
}
