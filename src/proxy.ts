import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { IDIOMAS, IDIOMA_BASE } from "@/config";
import { leerTokenSesion } from "@/lib/sesion";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

const ADMIN_PUBLICO = ["/admin/login", "/admin/create-password"];
const PREFIJO_IDIOMA = new RegExp(`^/(${IDIOMAS.join("|")})(?=/|$)`);

/**
 * Manda al login a quien entra al panel sin cookie de sesión.
 *
 * Es sólo la primera barrera: acá no se verifica la firma ni que la sesión
 * siga viva. Eso lo hace cada ruta de la API con `requireAuth`, que es lo que
 * de verdad protege los datos.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const idioma = PREFIJO_IDIOMA.exec(pathname)?.[1] ?? IDIOMA_BASE;
  const ruta = pathname.replace(PREFIJO_IDIOMA, "") || "/";

  const esPanel = ruta.startsWith("/admin") && !ADMIN_PUBLICO.some((p) => ruta.startsWith(p));
  if (esPanel && !leerTokenSesion((n) => request.cookies.get(n))) {
    return NextResponse.redirect(new URL(`/${idioma}/admin/login`, request.url));
  }

  return intl(request);
}

export const config = {
  // Fuera quedan la API, los estáticos y las rutas que no llevan idioma: la
  // redirección de la encuesta, los iconos y los archivos para LLM.
  matcher: "/((?!api|trpc|encuesta|icon|apple-icon|llms|_next|_vercel|.*\\..*).*)",
};
