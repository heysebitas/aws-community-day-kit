import { armarCorreoObligatorio } from "@/lib/email-plantillas";

const ROLES: Record<string, string> = {
  admin: "Administrador",
  organizer: "Organizador",
  volunteer: "Voluntario",
  badges: "Entrega de badges",
  register: "Registro",
};

/** El correo con el enlace para crear la contraseña. Sale de la plantilla `invitacion_panel`. */
export async function armarInvitacion(name: string, role: string, createPasswordUrl: string) {
  const correo = await armarCorreoObligatorio("invitacion_panel", {
    nombre: name ? name.split(" ")[0]! : "",
    nombreCompleto: name,
    rol: ROLES[role] || role,
    enlaceClave: createPasswordUrl,
  });
  return correo;
}
