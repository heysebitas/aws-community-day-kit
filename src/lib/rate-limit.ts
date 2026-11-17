import "server-only";
/**
 * Límite de peticiones en memoria.
 *
 * Vive en el proceso: alcanza para un servidor (VPS, contenedor) y frena el
 * abuso casual, pero en un despliegue con varias instancias cada una lleva su
 * propia cuenta. Para eso hace falta un almacén compartido; ver `docs/seguridad.md`.
 */

type Entrada = { count: number; resetAt: number };

const ventanas = new Map<string, Entrada>();
const fallos = new Map<string, Entrada>();

/** Tope duro de claves por mapa: en un ataque no deja crecer la memoria. */
export const MAX_ENTRADAS = 10_000;

/** Quita lo vencido y, si aun así no cabe, las claves más antiguas (los Map conservan el orden de inserción). */
function purgar(mapa: Map<string, Entrada>) {
  if (mapa.size < MAX_ENTRADAS / 2) return;
  const ahora = Date.now();
  for (const [k, e] of mapa) if (ahora >= e.resetAt) mapa.delete(k);
  for (const k of mapa.keys()) {
    if (mapa.size < MAX_ENTRADAS * 0.9) break;
    mapa.delete(k);
  }
}

/** Sólo para pruebas. */
export function tamanosDeMapas() {
  return { ventanas: ventanas.size, fallos: fallos.size };
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = ventanas.get(key);

  if (!entry || now >= entry.resetAt) {
    purgar(ventanas);
    ventanas.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (entry.count >= limit) return { ok: false, retryAfterMs: entry.resetAt - now };

  entry.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

/**
 * La IP de quien hace la petición.
 *
 * `X-Forwarded-For` es una lista a la que cada proxy añade por la derecha, y lo
 * que venga a la izquierda lo puede escribir el propio cliente. Por eso se
 * cuenta desde el final: con un proxy delante (nginx, un balanceador), la
 * última entrada es la IP real.
 *
 *   PROXIES_DE_CONFIANZA  cuántos proxies propios hay delante (por omisión, 1)
 *   CABECERA_IP           si tu CDN manda la IP en otra cabecera (Cloudflare:
 *                         `cf-connecting-ip`), su nombre. Sólo es fiable si el
 *                         servidor no acepta tráfico que no venga del CDN.
 */
export function getIp(request: Request): string {
  const cabecera = process.env.CABECERA_IP?.toLowerCase();
  if (cabecera) {
    const valor = request.headers.get(cabecera)?.trim();
    if (valor) return valor;
  }

  const lista = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!lista.length) return "unknown";

  const saltos = Math.max(1, Number(process.env.PROXIES_DE_CONFIANZA) || 1);
  return lista[Math.max(0, lista.length - saltos)]!;
}

// ── Intentos fallidos (PIN de patrocinadores, contraseñas) ──────────────────

/** Se llama sólo cuando el intento falla. Dice si la clave quedó bloqueada. */
export function recordFail(key: string, limit: number, windowMs: number): { blocked: boolean; retryAfterMs: number } {
  const now = Date.now();
  let entry = fallos.get(key);
  if (!entry || now >= entry.resetAt) {
    purgar(fallos);
    entry = { count: 0, resetAt: now + windowMs };
    fallos.set(key, entry);
  }
  entry.count += 1;
  const blocked = entry.count >= limit;
  return { blocked, retryAfterMs: blocked ? entry.resetAt - now : 0 };
}

/** Si la clave está bloqueada ahora mismo, sin sumar un intento. */
export function isBlocked(key: string, limit: number): { blocked: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = fallos.get(key);
  if (!entry || now >= entry.resetAt) return { blocked: false, retryAfterMs: 0 };
  const blocked = entry.count >= limit;
  return { blocked, retryAfterMs: blocked ? entry.resetAt - now : 0 };
}

export function clearFails(key: string): void {
  fallos.delete(key);
}
