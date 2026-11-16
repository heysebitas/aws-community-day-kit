import { EVENTO, PAIS } from "./index";
import { instante, siglaZona } from "./tiempo";
import type { Idioma } from "./tipos";

/** Las fechas del evento ya escritas, en la zona del evento y en el idioma pedido. */

/** El locale de `Intl` que corresponde a un idioma del sitio. */
export function localeDe(idioma: string): string {
  if (idioma === "en") return "en-US";
  if (idioma === "pt") return "pt-BR";
  return PAIS.locale.startsWith("es") ? PAIS.locale : "es";
}

const formato = (idioma: string, opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(localeDe(idioma), { timeZone: EVENTO.zona, ...opciones });

/** «23 de octubre de 2027» */
export function fechaLarga(iso: string, idioma: string): string {
  return formato(idioma, { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

/** «sábado 23 de octubre» */
export function fechaConDia(iso: string, idioma: string): string {
  return formato(idioma, { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

/** «23 oct 2027» */
export function fechaMedia(iso: string, idioma: string): string {
  return formato(idioma, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)).replace(/\./g, "");
}

/** «23.10.2027»: la forma de cintas y letreros, igual en todos los idiomas. */
export function fechaCorta(iso: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: EVENTO.zona, day: "2-digit", month: "2-digit", year: "numeric" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}.${p.month}.${p.year}`;
}

/** «8:30 am» */
export function hora(iso: string, idioma: string = "es"): string {
  return formato(idioma, { hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(/\s*a\.?\s*m\.?/i, " am")
    .replace(/\s*p\.?\s*m\.?/i, " pm");
}

/** «23:59» */
export function hora24(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: EVENTO.zona, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(iso));
}

/** «GMT-5», «CLST»: la sigla de la zona en esa fecha. */
export function zonaDe(iso: string, idioma: string = "es"): string {
  return siglaZona(EVENTO.zona, new Date(iso), localeDe(idioma));
}

/** «4°38′ N · 74°14′ O» */
export function coordenadas(idioma: Idioma | string = "es"): string {
  const { lat, lon } = EVENTO.coordenadas;
  const gm = (v: number) => {
    const abs = Math.abs(v);
    const g = Math.floor(abs);
    return `${g}°${String(Math.round((abs - g) * 60)).padStart(2, "0")}′`;
  };
  const oeste = idioma === "en" ? "W" : "O";
  return `${gm(lat)} ${lat >= 0 ? "N" : "S"} · ${gm(lon)} ${lon >= 0 ? "E" : oeste}`;
}

/** Una hora del programa («09:30») como instante, en el día y la zona del evento. */
export function horaDelEvento(hhmm: string): Date {
  return instante(`${EVENTO.fecha.inicio.slice(0, 10)}T${hhmm || "00:00"}`, EVENTO.zona);
}
