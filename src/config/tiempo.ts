/**
 * Convierte una hora local del evento en un instante.
 *
 * En la configuración se escribe la hora como la ve quien asiste
 * (`"2027-10-23T08:30"`) y la zona aparte. Hacer la cuenta a UTC a mano es
 * donde se cuelan los errores de una hora cuando el país cambia de horario.
 */

const PARTES = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Minutos que la zona lleva de adelanto sobre UTC en ese instante. */
function desfase(zona: string, instante: Date): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: zona, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(instante).map((x) => [x.type, Number(x.value)]));
  const comoUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!);
  return Math.round((comoUtc - instante.getTime()) / 60_000);
}

export function instante(local: string, zona: string): Date {
  const m = PARTES.exec(local);
  if (!m) throw new Error(`evento/config.ts: «${local}» no es una fecha válida. Formato: 2027-10-23T08:30.`);
  const [, a, mes, d, h, min] = m.map(Number);
  const supuesto = Date.UTC(a!, mes! - 1, d!, h!, min!);
  // Dos pasadas: la primera estima el desfase y la segunda lo corrige si la
  // estimación cayó al otro lado de un cambio de horario.
  let t = supuesto - desfase(zona, new Date(supuesto)) * 60_000;
  t = supuesto - desfase(zona, new Date(t)) * 60_000;
  return new Date(t);
}

/** Abreviatura de la zona en esa fecha («CLST», «GMT-5»), para mostrar junto a una hora. */
export function siglaZona(zona: string, cuando: Date, locale = "es"): string {
  const partes = new Intl.DateTimeFormat(locale, { timeZone: zona, timeZoneName: "short" }).formatToParts(cuando);
  return partes.find((p) => p.type === "timeZoneName")?.value ?? "";
}
