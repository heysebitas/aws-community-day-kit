import { revalidateTag } from "next/cache";
import { AGENDA_TAG } from "./agenda";
import { SPEAKERS_TAG } from "./speakers";
import { FAQ_TAG } from "./faq";

export { AGENDA_TAG, SPEAKERS_TAG, FAQ_TAG };

// Invalida la caché pública de esos tags: el cambio hecho en el panel se ve en la siguiente lectura.
export function revalidatePublic(...tags: string[]) {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
