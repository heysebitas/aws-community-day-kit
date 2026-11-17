"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Páginas con formulario: al volver traen el token del captcha vencido o el estado de «enviado». */
const CON_FORMULARIO = /^(?:\/[a-z]{2})?\/(?:registro|voluntarios|speakers\/postular|admin\/login)\/?$/;

export function conFormulario(ruta: string) {
  return CON_FORMULARIO.test(ruta);
}

/** Recarga al volver con «atrás» sólo en las páginas con formulario; el resto queda en bfcache. */
export function BfcacheReset() {
  const ruta = usePathname();
  const activo = conFormulario(ruta);

  useEffect(() => {
    if (!activo) return;
    const handlePopState = (e: PopStateEvent) => {
      if (e.isTrusted) window.location.reload();
    };
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [activo]);

  return null;
}
