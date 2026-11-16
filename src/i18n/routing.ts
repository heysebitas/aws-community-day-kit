import { defineRouting } from "next-intl/routing";
import { IDIOMAS, IDIOMA_BASE } from "@/config";

/** El idioma base va sin prefijo (`/registro`); los demás con el suyo (`/en/registro`). */
export const routing = defineRouting({
  locales: IDIOMAS,
  defaultLocale: IDIOMA_BASE,
  localePrefix: "as-needed",
});
