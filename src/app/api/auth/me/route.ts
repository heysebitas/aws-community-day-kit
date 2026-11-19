import { getAuthUser } from "@/lib/auth";
import { usuarioParaCliente } from "@/lib/lectores";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    return Response.json({ user: usuarioParaCliente(user) });
  } catch {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
}
