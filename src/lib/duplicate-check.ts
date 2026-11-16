import { Registration } from "@/models/registration";
import { VolunteerSubmission } from "@/models/volunteer-submission";

/**
 * Una persona no puede estar a la vez en la lista de asistentes y en la de
 * voluntarios: un correo repetido entre ambas suele ser alguien que se equivocó
 * de formulario. La búsqueda no distingue mayúsculas.
 */

/** Escapa el correo para usarlo como regex exacta sin sorpresas. */
function exactInsensitive(email: string) {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { $regex: `^${escaped}$`, $options: "i" };
}

export type CrossCheck = { blocked: true; error: string } | { blocked: false };

/** Para el formulario de voluntarios: ¿ya está inscrito como asistente? */
export async function checkAlreadyAttendee(email: string): Promise<CrossCheck> {
  if (!email) return { blocked: false };
  const isAttendee = await Registration.exists({ email: exactInsensitive(email) });
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
  if (!email) return { blocked: false };
  const isVolunteer = await VolunteerSubmission.exists({ email: exactInsensitive(email) });
  return isVolunteer
    ? {
        blocked: true,
        error:
          "Ya postulaste como Voluntario/a con este correo. Si quieres asistir como público, contacta a un organizador.",
      }
    : { blocked: false };
}
