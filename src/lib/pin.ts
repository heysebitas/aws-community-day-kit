import { randomInt } from "node:crypto";
import { clearFails, getIp, isBlocked, recordFail } from "@/lib/rate-limit";

/**
 * Los PIN cortos: el del dueño de un pasaporte y el de los stands.
 *
 * Un PIN de pocas cifras sólo aguanta si los intentos están contados. Se
 * cuentan dos veces: por quien intenta (para frenar a una persona) y por lo
 * que se intenta abrir (para frenar a muchas turnándose). Todas las rutas que
 * comparan un PIN pasan por acá: una sola sin contar deja la puerta abierta.
 */

const POR_IP = { limite: 5, ventana: 15 * 60 * 1000 };
const POR_OBJETIVO = { limite: 40, ventana: 60 * 60 * 1000 };

export function nuevoPin(): string {
  return String(randomInt(1000, 10000));
}

export type Intento =
  | { ok: true }
  | { ok: false; bloqueado: boolean; retryAfterMs: number };

/**
 * Compara un PIN contando el intento.
 *
 * `ambito` separa los contadores de cosas distintas («pasaporte», «sello») y
 * `objetivo` es lo que se quiere abrir.
 */
export function comprobarPin(request: Request, ambito: string, objetivo: string, dado: unknown, correcto: string | undefined | null): Intento {
  const porIp = `pin:${ambito}:${getIp(request)}:${objetivo}`;
  const porObjetivo = `pin:${ambito}:*:${objetivo}`;

  for (const [clave, regla] of [[porIp, POR_IP], [porObjetivo, POR_OBJETIVO]] as const) {
    const b = isBlocked(clave, regla.limite);
    if (b.blocked) return { ok: false, bloqueado: true, retryAfterMs: b.retryAfterMs };
  }

  if (typeof dado === "string" && !!correcto && dado === correcto) {
    clearFails(porIp);
    return { ok: true };
  }

  const a = recordFail(porIp, POR_IP.limite, POR_IP.ventana);
  const b = recordFail(porObjetivo, POR_OBJETIVO.limite, POR_OBJETIVO.ventana);
  const bloqueado = a.blocked || b.blocked;
  return { ok: false, bloqueado, retryAfterMs: Math.max(a.retryAfterMs, b.retryAfterMs) };
}
