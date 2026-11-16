"use client";

import { useAuth } from "@/contexts/auth-context";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { Sidebar } from "@/components/admin/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { localePath, idiomaDeRuta } from "@/lib/utils";
import { alcanza, seccionDeRuta } from "@/lib/permisos";

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = idiomaDeRuta(pathname);

  const pathWithoutLocale = pathname.replace(/^\/(es|en)/, "") || "/";
  const isLoginPage = pathWithoutLocale.startsWith("/admin/login");
  const isPublicPage = isLoginPage || pathWithoutLocale.startsWith("/admin/create-password");

  const isBadgesScanner = pathWithoutLocale.startsWith("/admin/escaner/badges");

  // La sección a la que pertenece esta página, si es de las que se pueden
  // recortar. El tablero y los números no tienen sección: los ve cualquiera.
  const seccion = seccionDeRuta(pathWithoutLocale);
  const sinPermiso = !!user && !!seccion && !alcanza(user, seccion, "ver");

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPage) {
      router.replace(localePath(locale, "/admin/login"));
    } else if (user && isLoginPage) {
      // Ya está autenticado: no mostrar el login.
      router.replace(localePath(locale, "/admin"));
    } else if (user && user.role === "badges" && !isBadgesScanner && !isPublicPage) {
      // El rol "badges" solo puede dar badges: se queda en su escáner.
      router.replace(localePath(locale, "/admin/escaner/badges"));
    } else if (sinPermiso) {
      // Escribir la URL a mano no sirve de atajo. La API ya responde 403, pero
      // sin esto la página se montaba igual y quedaba una pantalla rota llena
      // de errores en vez de un «no es para ti».
      router.replace(localePath(locale, "/admin"));
    }
  }, [loading, user, router, locale, isPublicPage, isLoginPage, isBadgesScanner, sinPermiso]);

  // Public admin pages (login, create-password) render without sidebar
  if (isPublicPage) {
    return <div className="min-h-screen bg-surface-900">{children}</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-900 px-5">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-acento border-t-transparent" />
          <span className="dot-matrix text-lg leading-none text-surface-300">cargando</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Mientras el `replace` de arriba viaja, no se pinta la sección prohibida.
  if (sinPermiso) return null;

  return (
    <div className="min-h-screen bg-surface-900">
      <Sidebar />
      <main className="lg:pl-64">
        {/* En movil hay que dejar libre el alto de la barra superior (3.5rem);
            en ancho la columna es fija y el contenido solo se corre a la
            derecha. */}
        <div className="px-4 pb-16 pt-[4.5rem] sm:px-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AdminGate>{children}</AdminGate>
      </ToastProvider>
    </AuthProvider>
  );
}
