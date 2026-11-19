import { resolver, tokensDe } from "@/i18n/tokens";
import type { TextosPorIdioma } from "./_shared";

/** Los dos idiomas del formulario de postulación, resueltos en el servidor. */
export async function textosPostulacion(): Promise<TextosPorIdioma> {
  const [es, en] = await Promise.all([import("@/messages/es.json"), import("@/messages/en.json")]);
  return {
    es: resolver(es.default.Postulacion, tokensDe("es")) as TextosPorIdioma["es"],
    en: resolver(en.default.Postulacion, tokensDe("en")) as TextosPorIdioma["en"],
  };
}
