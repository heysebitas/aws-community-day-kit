import { trackLabel } from "@/data/session-tracks";

/** En la base se guardan las claves; el correo enseña las etiquetas. */
const MODALIDAD: Record<string, string> = {
  online: "Online — sesión virtual",
  "in-person": "Presencial — en la sede",
};

const NIVEL: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  expert: "Experto",
};

const IDIOMA: Record<string, string> = { es: "Español", en: "English" };

export interface Propuesta {
  talkTitle: string;
  talkAbstract: string;
  sessionType: string;
  audienceLevel: string;
  track?: string;
  language: string;
  countryCity: string;
  tagline: string;
  requirements?: string;
  coSpeakerNames?: string[];
}

/** Las variables de la copia de la propuesta; las opcionales van vacías y su fila no sale. */
export function valoresDeLaPropuesta(p: Propuesta): Record<string, string> {
  return {
    charla: p.talkTitle,
    resumen: p.talkAbstract,
    modalidad: MODALIDAD[p.sessionType] ?? p.sessionType,
    nivel: NIVEL[p.audienceLevel] ?? p.audienceLevel,
    track: trackLabel(p.track),
    idioma: IDIOMA[p.language] ?? p.language,
    ubicacion: p.countryCity,
    cargo: p.tagline,
    coSpeakers: (p.coSpeakerNames ?? []).join(", "),
    requerimientos: p.requirements ?? "",
  };
}
