import { connectDB } from "@/lib/db";
import { EventConfig } from "@/models/event-config";
import { ENLACES, SEMILLA_ENLACES, variablesDeEnlaces } from "@/data/enlaces";

/** Cuánto vale ahora mismo cada enlace del catálogo de `@/data/enlaces`. */

export interface Enlaces {
  /** Por clave del catálogo. Las no configuradas vienen vacías. */
  valores: Record<string, string>;
  /** Las variables de correo que salen de ellos, sin las vacías. */
  variables: Record<string, string>;
}

/** No falla si todavía no existe la configuración: en una instalación nueva no hay documento. */
export async function enlacesActuales(): Promise<Enlaces> {
  await connectDB();

  const config = await EventConfig.findOne().select("enlaces trackVirtualUrl photosUrl recordingsUrl").lean() as
    | { enlaces?: Record<string, string>; trackVirtualUrl?: string; photosUrl?: string; recordingsUrl?: string }
    | null;

  // La semilla sólo cuenta mientras `enlaces` no exista. En cuanto se guarda
  // manda lo guardado, y un enlace vaciado a propósito se queda vacío.
  const base = config?.enlaces ?? SEMILLA_ENLACES;
  const valores = { ...Object.fromEntries(ENLACES.map((e) => [e.clave, ""])), ...base };

  // Los enlaces de la portada entran como variables de correo, pero se editan
  // en la configuración del evento.
  const delSitio: Record<string, string> = {};
  if (config?.trackVirtualUrl) delSitio.transmision = config.trackVirtualUrl;
  if (config?.photosUrl) delSitio.fotos = config.photosUrl;
  if (config?.recordingsUrl) delSitio.grabaciones = config.recordingsUrl;

  return { valores, variables: { ...variablesDeEnlaces(valores), ...delSitio } };
}

/** El grupo de WhatsApp de un speaker: el del track online si existe, y si no el general. */
export function grupoDeSpeaker(valores: Record<string, string>, online: boolean): string {
  if (online && valores.grupoSpeakersOnline) return valores.grupoSpeakersOnline;
  return valores.grupoSpeakers ?? "";
}
