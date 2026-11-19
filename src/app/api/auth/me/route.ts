import { ruta, logError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { usuarioParaCliente } from "@/lib/lectores";

export const GET = ruta(async () => {
  try {
    const user = await getAuthUser();
    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    return Response.json({ user: usuarioParaCliente(user) });
  } catch (e) {
    logError("auth/me GET", e);
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
}, { etiqueta: "auth/me GET" });
