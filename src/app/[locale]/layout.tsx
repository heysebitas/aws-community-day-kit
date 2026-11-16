import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { EVENTO, IDIOMAS, IDIOMA_BASE, PAIS, SITIO, TEMA } from "@/config";
import { localeDe } from "@/config/fechas";
import { TEMAS, variablesDeTema } from "@/config/temas";
import { DEMO } from "@/lib/env";
import { handjet, jetbrainsMono, oxanium } from "@/lib/fonts";
import { codificar } from "@/lib/buzones";
import { getPublicEventConfig, EMPTY_PUBLIC_CONFIG, isCfpOpen } from "@/lib/data/event-config";
import { localePath } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SiteChrome } from "@/components/layout/site-chrome";
import { EventConfigProvider } from "@/components/providers/event-config-provider";
import { EventJsonLd } from "@/components/seo/json-ld";
import { BfcacheReset } from "@/components/effects/bfcache-reset";
import { contacto } from "@evento/contacto";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Sólo en modo demo: `?tema=menta` pinta el sitio con ese tema, para compararlos
 * sin tocar la configuración. Corre antes de hidratar, así los canvas ya leen
 * el color nuevo.
 */
const VISTA_PREVIA_TEMA = `(function(){try{var t=new URLSearchParams(location.search).get("tema");var m=${JSON.stringify(
  Object.fromEntries(Object.entries(TEMAS).map(([nombre, t]) => [nombre, variablesDeTema(t)])),
)};if(t&&m[t]){for(var k in m[t])document.documentElement.style.setProperty(k,m[t][k]);}}catch(e){}})();`;

const og = (idioma: string) => localeDe(idioma).replace("-", "_");

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const url = (idioma: string) => `${SITIO}${localePath(idioma)}`.replace(/\/$/, "") || SITIO;
  const imagen = `${SITIO}/api/marca/banner`;

  return {
    metadataBase: new URL(SITIO),
    title: { default: t("title"), template: `%s | ${EVENTO.nombreCompleto}` },
    description: t("description"),
    keywords: [
      EVENTO.nombre,
      EVENTO.nombreCompleto,
      `${EVENTO.nombre} ${PAIS.nombre}`,
      `${EVENTO.siglas} ${EVENTO.edicion} ${EVENTO.anio}`,
      EVENTO.organiza,
      `${EVENTO.ciudad} ${EVENTO.anio}`,
      `evento cloud ${EVENTO.ciudad}`,
      `evento tecnología gratis ${EVENTO.ciudad}`,
      `cloud computing ${PAIS.nombre}`,
      EVENTO.sede.nombre,
    ],
    authors: [{ name: EVENTO.organiza }],
    creator: EVENTO.organiza,
    publisher: EVENTO.organiza,
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: url(locale),
      siteName: EVENTO.nombreCompleto,
      locale: og(locale),
      alternateLocale: IDIOMAS.filter((i) => i !== locale).map(og),
      type: "website",
      images: [{ url: imagen, width: 1200, height: 630, alt: EVENTO.nombreCompleto, type: "image/png" }],
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description"), images: [imagen] },
    alternates: {
      canonical: url(locale),
      languages: {
        ...Object.fromEntries(IDIOMAS.map((i) => [i, url(i)])),
        "x-default": url(IDIOMA_BASE),
      },
      types: { "text/markdown": `${SITIO}/llms-full.txt` },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Si la base falla, el sitio sigue en pie con los formularios cerrados.
  const [desdeLaBase, cfpOpen] = await Promise.all([
    getPublicEventConfig().catch(() => EMPTY_PUBLIC_CONFIG),
    isCfpOpen(),
  ]);
  const config = { ...desdeLaBase, cfpOpen, buzones: codificar(contacto) };

  return (
    <html
      lang={locale}
      className={`${jetbrainsMono.variable} ${oxanium.variable} ${handjet.variable} h-full antialiased`}
      style={variablesDeTema(TEMA) as React.CSSProperties}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-surface-900 font-sans text-surface-100">
        {DEMO && <script dangerouslySetInnerHTML={{ __html: VISTA_PREVIA_TEMA }} />}
        <BfcacheReset />
        <NextIntlClientProvider>
          <EventConfigProvider value={config}>
            <SiteChrome
              navbar={<Navbar />}
              footer={<Footer locale={locale} />}
              jsonLd={<EventJsonLd locale={locale} />}
            >
              {children}
            </SiteChrome>
          </EventConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
