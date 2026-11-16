import { Text } from "@react-email/components";
import { trackLabel } from "@/data/session-tracks";
import {
  APP_URL,
  C,
  DetailBox,
  Divider,
  HardButton,
  Kicker,
  MONO,
  Paragraph,
} from "./_kit";

export interface SpeakerSubmissionConfirmationEmailProps {
  firstName: string;
  talkTitle: string;
  talkAbstract: string;
  sessionType: string;
  audienceLevel: string;
  /** El track que eligió al postular. */
  track?: string;
  language: string;
  countryCity: string;
  tagline: string;
  requirements?: string;
  coSpeakerNames?: string[];
  /** Enlace público del perfil, una vez aprobado. */
  slug?: string;
}

/** Etiquetas legibles: en la base se guardan los valores en clave. */
const SESSION_TYPE: Record<string, string> = {
  online: "Online — sesión virtual",
  "in-person": "Presencial — en la sede",
};

const LEVEL: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  expert: "Experto",
};

const LANGUAGE: Record<string, string> = {
  es: "Español",
  en: "English",
};

/** La copia de lo enviado, para colgarla detrás de la plantilla editable. */
export function CopiaDeLaPropuesta({
  talkTitle, talkAbstract, sessionType, audienceLevel, language, track,
  countryCity, tagline, requirements, coSpeakerNames = [],
}: Omit<SpeakerSubmissionConfirmationEmailProps, "firstName">) {
  return (
    <>
      <Divider />

      <Kicker>copia de tu propuesta</Kicker>

      <Text
        style={{
          margin: "0 0 6px",
          fontFamily: MONO,
          fontSize: "11px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: C.blockDeep,
        }}
      >
        Título
      </Text>
      <Text
        style={{
          margin: "0 0 18px",
          fontFamily: MONO,
          fontSize: "15px",
          fontWeight: 700,
          lineHeight: "1.5",
          color: C.block,
        }}
      >
        {talkTitle}
      </Text>

      <Text
        style={{
          margin: "0 0 6px",
          fontFamily: MONO,
          fontSize: "11px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: C.blockDeep,
        }}
      >
        Descripción
      </Text>
      <Text
        style={{
          margin: "0 0 20px",
          fontFamily: MONO,
          fontSize: "13px",
          lineHeight: "1.7",
          color: C.muted,
          whiteSpace: "pre-wrap",
        }}
      >
        {talkAbstract}
      </Text>

      <DetailBox
        rows={[
          { label: "Modalidad", value: SESSION_TYPE[sessionType] ?? sessionType },
          { label: "Nivel", value: LEVEL[audienceLevel] ?? audienceLevel },
          // Para que vea en qué carril quedó y pueda avisarnos si se equivocó.
          ...(trackLabel(track) ? [{ label: "Track", value: trackLabel(track) }] : []),
          { label: "Idioma", value: LANGUAGE[language] ?? language },
          { label: "Ciudad", value: countryCity },
          { label: "Tu rol", value: tagline },
          ...(coSpeakerNames.length > 0
            ? [{ label: "Co-speakers", value: coSpeakerNames.join(", ") }]
            : []),
          ...(requirements
            ? [{ label: "Requerimientos", value: requirements }]
            : []),
        ]}
      />

      <Paragraph muted>
        La propuesta no se puede editar desde el sitio. Si viste algo mal en
        esta copia, respóndenos este correo antes del cierre y lo corregimos.
      </Paragraph>

      <Divider />

      <HardButton href={APP_URL}>Ver el sitio</HardButton>
    </>
  );
}
