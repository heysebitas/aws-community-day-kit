import "server-only";
import { DEMO, PRODUCCION } from "@/lib/env";

/** Un token de Turnstile vale una sola vez; duran unos cinco minutos. */
const usados = new Map<string, number>();
const VIDA_MS = 5 * 60 * 1000;

function marcarUsado(token: string) {
  if (usados.size > 1000) {
    const ahora = Date.now();
    for (const [t, vence] of usados) if (vence <= ahora) usados.delete(t);
  }
  usados.set(token, Date.now() + VIDA_MS);
}

/**
 * Comprueba un token de Cloudflare Turnstile.
 *
 * Sin `TURNSTILE_SECRET_KEY` sólo se acepta en desarrollo o en modo demo. En
 * producción se rechaza: un despliegue al que se le olvidó la llave no debe
 * quedar con los formularios abiertos a cualquier bot.
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (token && usados.has(token)) return false;

  if (!secret) {
    if (PRODUCCION && !DEMO) return false;
    if (token) marcarUsado(token);
    return true;
  }

  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
      signal: AbortSignal.timeout(Number(process.env.HTTP_TIMEOUT_MS) || 10_000),
    });
    const data = (await res.json()) as { success: boolean };
    if (data.success !== true) return false;
  } catch {
    return false;
  }

  marcarUsado(token);
  return true;
}
