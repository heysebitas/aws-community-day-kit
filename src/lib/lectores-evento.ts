import { unstable_cache } from "next/cache";
import { datosDelEvento, llmsTxt, llmsFull } from "@/lib/llm";
import { SPEAKERS_TAG, AGENDA_TAG, FAQ_TAG } from "@/lib/data/revalidate";
import { EVENT_CONFIG_TAG } from "@/lib/data/event-config";

type Idioma = Parameters<typeof datosDelEvento>[0];

// Lo que lee el público de /api/evento y llms*.txt: se rehace como mucho cada
// 5 min, o al momento si el panel edita speakers, agenda, preguntas o la configuración.
const ETIQUETAS_PUBLICAS = [SPEAKERS_TAG, AGENDA_TAG, FAQ_TAG, EVENT_CONFIG_TAG];
const REVALIDAR_S = 300;

export const datosDelEventoCacheados = unstable_cache(
  (idioma: Idioma) => datosDelEvento(idioma), ["lector-evento"], { revalidate: REVALIDAR_S, tags: ETIQUETAS_PUBLICAS },
);
export const llmsTxtCacheado = unstable_cache(
  (idioma: Idioma) => llmsTxt(idioma), ["lector-llms"], { revalidate: REVALIDAR_S, tags: ETIQUETAS_PUBLICAS },
);
export const llmsFullCacheado = unstable_cache(
  (idioma: Idioma) => llmsFull(idioma), ["lector-llms-full"], { revalidate: REVALIDAR_S, tags: ETIQUETAS_PUBLICAS },
);
