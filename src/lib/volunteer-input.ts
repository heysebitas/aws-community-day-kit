import {
  FREE_TEXT_MAX,
} from "@/data/attendee-form";
import {
  AVAILABILITY,
  DIETARY,
  INTEREST_AREAS,
  MOTIVATION_MAX,
  PREVIOUS_EXPERIENCE,
  SHIRT_SIZES,
  VOLUNTEER_TEXT_MAX,
  type Option,
} from "@/data/volunteer-form";
import { cleanWhitespace, toName, normalizeDocument, normalizeEmail } from "@/lib/normalize";
import { DOCUMENTOS, ROLES, ENTIDADES } from "@/config";

/**
 * Convierte lo que llega del formulario de voluntarios en campos del modelo.
 * Valida en el servidor: una petición se puede armar a mano. Devuelve códigos,
 * no etiquetas.
 */


export type VolunteerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  role: string;
  roleOther: string | null;
  entityType: string;
  entityName: string | null;
  sbg: string;
  availability: string;
  interestAreas: string[];
  previousExperience: string;
  motivation: string;
  shirtSize: string;
  dietary: string;
  dietaryOther: string | null;
  emergencyName: string;
  emergencyPhone: string;
  consent: { codeOfConduct: Date | null; privacy: Date | null };
};

type Parsed = { data: VolunteerInput } | { error: string };

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? cleanWhitespace(v).slice(0, max) : "";

/** Acepta el código y también la etiqueta, para el alta manual del panel. */
const pick = (list: Option[], raw: string): Option | undefined =>
  list.find((o) => o.value === raw || o.label === raw);

export function parseVolunteerInput(
  raw: Record<string, unknown>,
  opts: { manual?: boolean } = {},
): Parsed {
  const firstName = toName(str(raw.firstName, 60));
  const lastName = toName(str(raw.lastName, 60));
  if (!firstName) return { error: "Falta el nombre." };
  if (!lastName) return { error: "Falta el apellido." };

  const mail = normalizeEmail(str(raw.email, 200));
  if (!mail.ok) return { error: mail.reason ?? "El correo no es válido." };

  // ── Documento ──
  // Acá sí es obligatorio: el voluntariado es presencial y el equipo entra a la
  // sede antes que el público.
  const wantedDoc = str(raw.documentType, 40);
  const doc = DOCUMENTOS.find((d) => d.value === wantedDoc || d.label === wantedDoc);
  if (!doc) return { error: "Falta el tipo de documento." };
  const checked = normalizeDocument(str(raw.documentNumber, 30), doc.rule);
  if (!checked.ok) return { error: checked.reason };

  // ── Rol y entidad ──
  const wantedRole = str(raw.role, 80);
  const role = ROLES.find((r) => r.value === wantedRole || r.label === wantedRole);
  const roleValue = role ? role.value : "other";
  const roleOther = role && role.value !== "other"
    ? null
    : str(raw.roleOther || wantedRole, FREE_TEXT_MAX) || null;
  if (roleValue === "other" && !roleOther) return { error: "Falta indicar cuál es tu rol." };

  const wantedEntity = str(raw.entityType, 60);
  const entity = ENTIDADES.find(
    (e) => e.value === wantedEntity || e.label === wantedEntity,
  );
  if (!entity) return { error: "Falta indicar de dónde vienes." };
  const entityName = entity.value === "none"
    ? null
    : str(raw.entityName, FREE_TEXT_MAX) || null;
  if (entity.value !== "none" && !entityName) {
    return { error: "Falta el nombre de la entidad." };
  }

  // El grupo se guarda con su nombre: la lista se edita desde el panel y no hay
  // catálogo fijo. «other» se sustituye por lo que la persona escribió.
  const rawSbg = str(raw.sbg, VOLUNTEER_TEXT_MAX);
  const sbg = rawSbg === "other"
    ? str(raw.sbgOther, VOLUNTEER_TEXT_MAX) || "none"
    : rawSbg || "none";

  // ── Voluntariado ──
  const availability = pick(AVAILABILITY, str(raw.availability, 30));
  if (!availability) return { error: "Falta tu disponibilidad." };

  const rawAreas = Array.isArray(raw.interestAreas) ? raw.interestAreas : [];
  const interestAreas = rawAreas
    .map((a) => pick(INTEREST_AREAS, str(a, 40))?.value)
    .filter((a): a is string => Boolean(a));
  if (!interestAreas.length) return { error: "Elige al menos un área de interés." };

  const previousExperience =
    pick(PREVIOUS_EXPERIENCE, str(raw.previousExperience, 20))?.value ?? "none";
  const motivation = str(raw.motivation, MOTIVATION_MAX);

  // ── Logística ──
  const shirtSize = pick(SHIRT_SIZES, str(raw.shirtSize, 10));
  if (!shirtSize) return { error: "Falta la talla de la camiseta." };

  const dietary = pick(DIETARY, str(raw.dietary, 20))?.value ?? "none";
  const dietaryOther = dietary === "other"
    ? str(raw.dietaryOther, VOLUNTEER_TEXT_MAX) || null
    : null;
  if (dietary === "other" && !dietaryOther) {
    return { error: "Cuéntanos cuál es tu restricción alimentaria." };
  }

  const emergencyName = str(raw.emergencyName, 80);
  const emergencyPhone = str(raw.emergencyPhone, 40);
  if (!emergencyName) return { error: "Falta el contacto de emergencia." };
  if (!emergencyPhone) return { error: "Falta el teléfono del contacto de emergencia." };

  // ── Consentimientos ──
  const now = new Date();
  const accepted = (v: unknown) =>
    v === true || v === "sí" || v === "si" || v === "true" || v === "1";
  const coc = opts.manual || accepted(raw.acceptCoc);
  const priv = opts.manual || accepted(raw.acceptPrivacy);
  if (!coc) return { error: "Falta aceptar el código de conducta." };
  if (!priv) return { error: "Falta autorizar el tratamiento de datos." };

  return {
    data: {
      firstName,
      lastName,
      email: mail.value,
      phone: str(raw.phone, 40),
      documentType: doc.value,
      documentNumber: checked.value,
      role: roleValue,
      roleOther,
      entityType: entity.value,
      entityName,
      sbg,
      availability: availability.value,
      interestAreas,
      previousExperience,
      motivation,
      shirtSize: shirtSize.value,
      dietary,
      dietaryOther,
      emergencyName,
      emergencyPhone,
      consent: { codeOfConduct: now, privacy: now },
    },
  };
}
