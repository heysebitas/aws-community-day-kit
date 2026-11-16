import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    return Response.json({
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        // El menú y las páginas los usan para esconder lo que no corresponde.
        // Esconder es cortesía: quien manda es `requireAccess` en el servidor.
        permisos: user.permisos ?? [],
      },
    });
  } catch {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
}
