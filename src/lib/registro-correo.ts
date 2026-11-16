import "server-only";
import { after } from "next/server";
import { sendEmail, EMAIL_FROM } from "@/lib/correo";
import { buildRegistrationEmail } from "@/lib/registration-email";
import { Registration, type Attendance } from "@/models/registration";

/**
 * Manda el correo de un registro ya guardado y anota `emailStatus`.
 *
 * Va fuera de la petición (`after()` en la ruta); se aísla aquí para que una
 * prueba la invoque directo, porque `after()` no se puede llamar sin petición.
 * Nunca lanza: nadie espera la respuesta.
 */
export async function enviarCorreoRegistro(registrationId: string, name: string, email: string, attendance: Attendance): Promise<void> {
  try {
    const registration = await Registration.findById(registrationId);
    if (!registration) return;
    try {
      const built = await buildRegistrationEmail(name, registration.qrCode, attendance);
      // La referencia al final es lo que permite casar el webhook de Resend
      // con este registro, así que va en los dos casos.
      const html = `${built.html}<!-- ref:${registration.qrCode} -->`;
      const result = await sendEmail({ from: EMAIL_FROM, to: email, subject: built.subject, html, attachments: built.attachments });
      if (result.error) {
        registration.emailStatus = "failed";
        registration.emailError = result.error;
      } else {
        registration.emailStatus = "sent";
        registration.emailSentAt = new Date();
        registration.resendId = result.id;
      }
    } catch (e) {
      registration.emailStatus = "failed";
      registration.emailError = (e as Error).message;
    }
    await registration.save();
  } catch (e) {
    console.error("[registro] no se pudo anotar el estado del correo:", (e as Error).message);
  }
}

/**
 * `after()` de Next. Fuera de una petición (pruebas, scripts) lanza, y ahí la
 * tarea sale suelta: nadie espera la respuesta de todos modos.
 */
export function despuesDeResponder(tarea: () => Promise<void>): void {
  try {
    after(tarea);
  } catch {
    void tarea();
  }
}
