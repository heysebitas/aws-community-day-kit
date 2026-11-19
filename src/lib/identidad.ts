import { nanoid } from "nanoid";
import { EVENTO } from "@/config";

/**
 * Los identificadores de una persona registrada son tres y no se intercambian:
 * `qrCode` abre la puerta (y el pase), `shortId` es lo que se comparte del
 * pasaporte y `tokenConfirmacion` es lo que va en el enlace de confirmación.
 * Que uno se vea no da los otros.
 */
export const nuevoShortId = () => nanoid(10);
export const nuevoTokenConfirmacion = () => nanoid(21);

/** Los enlaces de antes del cambio (que llevaban el `qrCode`) valen hasta que acaba el evento. */
export function enlacesViejosVigentes(ahora = Date.now()): boolean {
  return ahora <= new Date(EVENTO.fin).getTime();
}
