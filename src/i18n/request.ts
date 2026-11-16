import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { EVENTO } from "@/config";
import type { Idioma } from "@/config/tipos";
import { routing } from "./routing";
import { resolver, tokensDe } from "./tokens";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const crudos = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages: resolver(crudos, tokensDe(locale as Idioma)),
    // Sin esto next-intl formatea con la zona de la máquina donde corre.
    timeZone: EVENTO.zona,
  };
});
