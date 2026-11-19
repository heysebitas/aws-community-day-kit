import { Registration } from "@/models/registration";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { normalizeEmail } from "@/lib/normalize";

/**
 * Una persona no puede estar a la vez en la lista de asistentes y en la de
 * voluntarios: un correo repetido entre ambas suele ser alguien que se equivocó
 * de formulario. El correo se guarda en minúsculas y recortado, así que la igualdad exacta sobre el
 * normalizado usa el índice único (sin regex).
 */

export type CrossCheck = { blocked: true; error: string } | { blocked: false };

/** Para el formulario de voluntarios: ¿ya está inscrito como asistente? */
export async function checkAlreadyAttendee(email: string): Promise<CrossCheck> {
  const correo = normalizeEmail(email).value;
  if (!correo) return { blocked: false };
  const isAttendee = await Registration.exists({ email: correo });
  return isAttendee
    ? {
        blocked: true,
        error:
          "Ya estás registrado como Asistente con este correo. Si quieres ser voluntario/a, contacta a un organizador.",
      }
    : { blocked: false };
}

/** Para el formulario de registro: ¿ya postuló como voluntario? */
export async function checkAlreadyVolunteer(email: string): Promise<CrossCheck> {
  const correo = normalizeEmail(email).value;
  if (!correo) return { blocked: false };
  const isVolunteer = await VolunteerSubmission.exists({ email: correo });
  return isVolunteer
    ? {
        blocked: true,
        error:
          "Ya postulaste como Voluntario/a con este correo. Si quieres asistir como público, contacta a un organizador.",
      }
    : { blocked: false };
}
