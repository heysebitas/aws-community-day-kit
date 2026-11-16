import { IDIOMA_BASE, TEMA } from "@/config";
import { variablesDeTema } from "@/config/temas";
import { resolver, tokensDe } from "@/i18n/tokens";
import { handjet, jetbrainsMono, oxanium } from "@/lib/fonts";
import { NotFoundScreen } from "@/components/not-found-screen";

/**
 * El 404 de las rutas que no caen bajo `[locale]`. Acá no hay layout con
 * idioma, así que monta su propio `<html>` y lee los textos del idioma base.
 */
export default async function RootNotFound() {
  const crudos = (await import(`../messages/${IDIOMA_BASE}.json`)).default;
  const t = resolver(crudos.NotFound, tokensDe(IDIOMA_BASE)) as Record<string, string>;

  return (
    <html
      lang={IDIOMA_BASE}
      className={`${jetbrainsMono.variable} ${oxanium.variable} ${handjet.variable} h-full antialiased`}
      style={variablesDeTema(TEMA) as React.CSSProperties}
    >
      <body className="min-h-full bg-surface-900 font-sans text-surface-100">
        <NotFoundScreen
          textos={{
            lead: t.lead,
            evento: t.event,
            inicio: t.home,
            registro: t.register,
            hrefInicio: "/",
            hrefRegistro: "/registro",
          }}
        />
      </body>
    </html>
  );
}
