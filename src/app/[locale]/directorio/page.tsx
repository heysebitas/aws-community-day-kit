import { setRequestLocale } from "next-intl/server";
import { getAgendaEvents } from "@/lib/data/agenda";
import { getPublicSpeakers } from "@/lib/data/speakers";
import { DirectorioScreen } from "./_screen";

/** Los datos se leen en el servidor (con la caché de `lib/data`) y la parte interactiva va en `_screen`. */
export default async function DirectorioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Si la base no responde, la pantalla sale vacía ("Próximamente") en vez de romperse.
  const [profiles, agenda] = await Promise.all([
    getPublicSpeakers().catch(() => []),
    getAgendaEvents().catch(() => []),
  ]);
  return <DirectorioScreen profiles={profiles} agenda={agenda} />;
}
