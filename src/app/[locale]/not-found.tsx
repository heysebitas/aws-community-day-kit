import { getLocale, getTranslations } from "next-intl/server";
import { NotFoundScreen } from "@/components/not-found-screen";
import { localePath } from "@/lib/utils";

export default async function NotFound() {
  const [t, locale] = await Promise.all([getTranslations("NotFound"), getLocale()]);

  return (
    <NotFoundScreen
      textos={{
        lead: t("lead"),
        evento: t("event"),
        inicio: t("home"),
        registro: t("register"),
        hrefInicio: localePath(locale),
        hrefRegistro: localePath(locale, "/registro"),
      }}
    />
  );
}
