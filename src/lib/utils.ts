import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { EVENTO, IDIOMAS, IDIOMA_BASE, PAIS } from "@/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Prefijo de los estáticos. Sólo existe en el export a GitHub Pages, que sirve bajo `/repo`. */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Una ruta con el prefijo de idioma que le toca: el idioma base va sin
 * prefijo y los demás con `/en`, `/pt`… `path` empieza por `/` o es `""` para
 * la portada.
 */
export function localePath(locale: string, path: string = ""): string {
  if (locale === IDIOMA_BASE) return path || "/";
  return `/${locale}${path}`;
}

/** El idioma de una ruta: el de su primer tramo, o el base si no lleva prefijo. */
export function idiomaDeRuta(pathname: string): string {
  const tramo = pathname.split("/")[1] ?? "";
  return (IDIOMAS as readonly string[]).includes(tramo) ? tramo : IDIOMA_BASE;
}

// Las fechas del panel se muestran en la zona del evento, no en la del
// navegador: quien revisa un check-in desde otro país tiene que ver la hora a
// la que pasó en la puerta.

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(PAIS.locale, {
    day: "2-digit", month: "short", year: "numeric", timeZone: EVENTO.zona,
  });
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(PAIS.locale, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: EVENTO.zona,
  });
}

/** ana.perez@example.com → ana****@e****.com */
export function maskEmail(email: string): string {
  const [local, domain] = (email || "").split("@");
  if (!local || !domain) return email || "";
  const maskLocal = local.length <= 3 ? `${local[0] ?? ""}***` : `${local.slice(0, 3)}****`;
  const dot = domain.lastIndexOf(".");
  const dom = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${maskLocal}@${dom[0] ?? ""}****${tld}`;
}

export interface BadgeNameOption {
  first: string;
  last: string;
  label: string;
}

/**
 * Las formas en que alguien puede aparecer en su escarapela: cada combinación
 * de uno de sus nombres con uno de sus apellidos. La primera es la de por omisión.
 *
 * «JOHAN SEBASTIÁN» + «ACUÑA BERNAL» → JOHAN ACUÑA · SEBASTIÁN ACUÑA · JOHAN BERNAL · SEBASTIÁN BERNAL
 */
export function badgeNameOptions(first: string, last: string): {
  firsts: string[];
  lasts: string[];
  options: BadgeNameOption[];
  default: BadgeNameOption;
} {
  const partir = (s: string) => (s || "").trim().split(/\s+/).filter(Boolean).map((x) => x.toUpperCase());
  const firsts = partir(first);
  const lasts = partir(last);
  const firstsSafe = firsts.length ? firsts : [""];
  const lastsSafe = lasts.length ? lasts : [""];

  const options: BadgeNameOption[] = [];
  for (const f of firstsSafe) {
    for (const l of lastsSafe) {
      options.push({ first: f, last: l, label: [f, l].filter(Boolean).join(" ") });
    }
  }

  return { firsts: firstsSafe, lasts: lastsSafe, options, default: options[0]! };
}
