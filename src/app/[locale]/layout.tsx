import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations, getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { MENSAJES_COMUN, pick } from "@/i18n/mensajes-cliente";
import { EVENTO, IDIOMAS, IDIOMA_BASE, PAIS, SITIO, TEMA } from "@/config";
import { localeDe } from "@/config/fechas";
import { TEMAS, variablesDeTema } from "@/config/temas";
import { DEMO } from "@/lib/env";
import { handjet, jetbrainsMono, oxanium } from "@/lib/fonts";
import { codificar } from "@/lib/buzones";
import { getPublicEventConfig, EMPTY_PUBLIC_CONFIG } from "@/lib/data/event-config";
import { localePath } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SiteChrome } from "@/components/layout/site-chrome";
import { cfpAbierto } from "@/hooks/cfp-abierto";
import { EventConfigProvider } from "@/components/providers/event-config-provider";
import { EventJsonLd } from "@/components/seo/json-ld";
import { BfcacheReset } from "@/components/effects/bfcache-reset";
import { SCRIPT_MODESTO } from "@/lib/dispositivo";
import { reglasEspeculativas } from "@/lib/speculation-rules";
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
  const mensajes = await getMessages();
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const desdeLaBase = await getPublicEventConfig().catch(() => EMPTY_PUBLIC_CONFIG);
  const config = {
    ...desdeLaBase,
    cfpOpen: cfpAbierto(EVENTO.cfpCierre, Date.now()),
    cfpCierre: EVENTO.cfpCierre,
    buzones: codificar(contacto),
  };

  return (
    <html
      lang={locale}
      className={`${jetbrainsMono.variable} ${oxanium.variable} ${handjet.variable} h-full antialiased`}
      style={variablesDeTema(TEMA) as React.CSSProperties}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        {/* `js` va antes de pintar: el CSS oculta lo que anima sólo si hay JS. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* `modesto` también va antes de pintar: el CSS detiene las animaciones infinitas. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_MODESTO }} />
      </head>
      <body className="min-h-full bg-surface-900 font-sans text-surface-100">
        <a
          href="#contenido"
          className="fixed left-2 top-2 z-[300] -translate-y-[200%] border-2 border-acento bg-surface-900 px-4 py-2 font-mono text-sm text-acento focus:translate-y-0"
        >
          {tNav("skip_to_content")}
        </a>
        {DEMO && <script dangerouslySetInnerHTML={{ __html: VISTA_PREVIA_TEMA }} />}
        <BfcacheReset />
        {/* Sin precarga especulativa en dispositivos modestos. */}
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.contains('modesto')||document.body.append(Object.assign(document.createElement('script'),{type:'speculationrules',text:${JSON.stringify(JSON.stringify(reglasEspeculativas()))}}))` }} />
        <NextIntlClientProvider messages={pick(mensajes, MENSAJES_COMUN)}>
          <EventConfigProvider value={config}>
            <SiteChrome
              navbar={<Navbar />}
              footer={<Footer locale={locale} />}
              jsonLd={<EventJsonLd locale={locale} />}
            >
              <div id="contenido" tabIndex={-1} className="outline-hidden">
                {children}
              </div>
            </SiteChrome>
          </EventConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
