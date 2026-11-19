"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

/** Por capacidades, no por user agent: lo que el sitio necesita es oklch y :has() (Chrome 111, Safari 16.4, Firefox 128). */
function esViejo() {
  try {
    return !(CSS.supports("color", "oklch(0 0 0)") && CSS.supports("selector(:has(*))"));
  } catch {
    return true;
  }
}

const sinSuscripcion = () => () => {};

export function AvisoNavegador() {
  const t = useTranslations("Nav");
  // En el servidor y en la hidratación vale `false`: no cambia el HTML inicial.
  const viejo = useSyncExternalStore(sinSuscripcion, esViejo, () => false);
  if (!viejo) return null;
  return (
    <p role="note" className="border-b-2 border-acento bg-surface-900 px-4 py-2 text-center font-mono text-xs text-surface-100">
      {t("navegador_viejo")}
    </p>
  );
}
