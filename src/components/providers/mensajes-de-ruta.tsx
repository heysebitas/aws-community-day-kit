import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { MENSAJES_RUTA, pick, type RutaConMensajes } from "@/i18n/mensajes-cliente";

/** Provider de una ruta: sólo los namespaces que sus componentes cliente necesitan. */
export async function MensajesDeRuta({
  ruta,
  params,
  children,
}: {
  ruta: RutaConMensajes;
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
}) {
  // Con el idioma explícito la ruta sigue siendo estática: sin él lee cabeceras.
  const { locale } = await params;
  const mensajes = await getMessages({ locale });
  const lista: readonly string[] | "todo" = MENSAJES_RUTA[ruta];
  return (
    <NextIntlClientProvider messages={lista === "todo" ? mensajes : pick(mensajes, lista)}>
      {children}
    </NextIntlClientProvider>
  );
}
