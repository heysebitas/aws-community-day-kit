import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EVENTO, IDIOMAS, IDIOMA_BASE, SITIO } from "@/config";
import { localePath } from "@/lib/utils";

/**
 * Los metadatos de una página pública: título, descripción, dirección
 * canónica y sus traducciones.
 *
 * Los textos salen de `Metadata` en los mensajes, con la clave de la página
 * (`registro_title`, `registro_desc`), así que no hay un título escrito en el
 * código de ninguna página. Una página que ya tiene su propio título (las
 * legales) lo pasa en `titulo` y de aquí sólo toma la descripción y las
 * direcciones.
 */
export async function metadatosDe(
  locale: string,
  ruta: string,
  clave: string,
  opciones: { titulo?: string } = {},
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const url = (idioma: string) => `${SITIO}${localePath(idioma, ruta)}`;
  const titulo = opciones.titulo ?? t(`${clave}_title`);
  const descripcion = t(`${clave}_desc`);

  return {
    title: titulo,
    description: descripcion,
    openGraph: { title: `${titulo} — ${EVENTO.nombreCompleto}`, description: descripcion, url: url(locale) },
    twitter: { card: "summary_large_image", title: `${titulo} — ${EVENTO.nombreCompleto}`, description: descripcion },
    alternates: {
      canonical: url(locale),
      languages: { ...Object.fromEntries(IDIOMAS.map((i) => [i, url(i)])), "x-default": url(IDIOMA_BASE) },
    },
  };
}
