/** Los estados por los que pasa una postulación de charla. */

export const PROFILE_STATUSES = [
  "submitted", "reviewing", "accepted", "rejected", "waitlisted", "scheduled",
] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/** Guard para validar el `status` que llega por query string o por el cuerpo. */
export function isProfileStatus(value: string): value is ProfileStatus {
  return (PROFILE_STATUSES as readonly string[]).includes(value);
}

/** Cómo se llama cada estado en el panel. */
export const ETIQUETA_ESTADO: Record<ProfileStatus, string> = {
  submitted: "Postulada",
  reviewing: "En revisión",
  accepted: "Aceptada",
  rejected: "No seleccionada",
  waitlisted: "En lista de espera",
  scheduled: "Ya en agenda",
};
