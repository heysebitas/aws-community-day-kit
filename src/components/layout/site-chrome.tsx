"use client";

import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { HashScroll } from "@/components/layout/hash-scroll";
import { AvisoNavegador } from "@/components/layout/aviso-navegador";
import { ScrollProgress } from "@/components/ui/scroll-progress";

/** Decide si se pintan la barra y el pie, según la ruta. */

/** Rutas que van sin el envoltorio del sitio. */
function modoDe(pathname: string) {
  // El login es la excepción dentro de `/admin`: sin barra no hay cómo volver al sitio.
  const esAdmin = pathname.includes("/admin") && !pathname.includes("/admin/login");
  // Pasaporte y confirmación son pantallas a pantalla completa.
  const esInmersiva = pathname.includes("/pasaporte") || pathname.includes("/confirmar");
  return { esAdmin, esInmersiva };
}

export function SiteChrome({
  navbar,
  footer,
  jsonLd,
  children,
}: {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  jsonLd: React.ReactNode;
  children: React.ReactNode;
}) {
  const { esAdmin, esInmersiva } = modoDe(usePathname() ?? "");
  const pelada = esAdmin || esInmersiva;

  // Con movimiento reducido, motion quita los desplazamientos y deja la opacidad.
  return (
    <MotionConfig reducedMotion="user">
      {!pelada && <ScrollProgress />}
      {!pelada && <HashScroll />}
      {!esAdmin && <AvisoNavegador />}
      {!pelada && navbar}
      {children}
      {!pelada && footer}
      {!pelada && <ScrollToTop />}
      {!pelada && jsonLd}
    </MotionConfig>
  );
}
