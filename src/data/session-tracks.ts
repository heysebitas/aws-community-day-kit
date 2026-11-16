import { tracks } from "@evento/tracks";
import { TEMA } from "@/config";

/** Los tracks tal como los usa el código: panel, sitio, tarjetas e imágenes. */

export type SessionTrack = {
  /** Se guarda en la base. */
  value: string;
  label: string;
  /** Para distintivos y filtros. */
  corto: string;
  /** Clases del distintivo en el panel. */
  color: string;
  /** Clases del distintivo en el sitio público. */
  publico: string;
  /** Para las imágenes generadas, donde no hay clases. */
  hex: string;
};

const PALETA: Array<Pick<SessionTrack, "color" | "publico" | "hex">> = [
  { color: "border-sky-400/50 bg-sky-400/15 text-sky-300", publico: "text-sky-300 border-sky-300/40 bg-sky-300/10", hex: "#8AB4F8" },
  { color: "border-purple-400/50 bg-purple-400/15 text-purple-300", publico: "text-purple-400 border-purple-400/40 bg-purple-400/10", hex: "#C9A9FF" },
  { color: "border-red-500/50 bg-red-500/15 text-red-300", publico: "text-red-400 border-red-400/40 bg-red-400/10", hex: "#F28B82" },
  { color: "border-green-400/50 bg-green-400/15 text-green-300", publico: "text-green-400 border-green-400/40 bg-green-400/10", hex: "#5BD6A6" },
  { color: "border-amber-400/50 bg-amber-400/15 text-amber-300", publico: "text-amber-400 border-amber-400/40 bg-amber-400/10", hex: "#FBBF24" },
  { color: "border-pink-400/50 bg-pink-400/15 text-pink-300", publico: "text-pink-400 border-pink-400/40 bg-pink-400/10", hex: "#F472B6" },
];

/**
 * «No pertenece a ningún track»: lo llevan los bloques de agenda que no son
 * una charla (acreditación, café) y las propuestas sin clasificar. No es un
 * track, así que no sale como filtro ni pinta distintivo.
 */
export const SIN_TRACK = "general";

export const TRACKS: SessionTrack[] = tracks.map((t, i) => ({
  value: t.id,
  label: t.titulo.label,
  corto: t.corto,
  ...PALETA[i % PALETA.length],
}));

const POR_VALOR = new Map(TRACKS.map((t) => [t.value, t]));

export function trackDe(value: string | null | undefined): SessionTrack | null {
  if (!value || value === SIN_TRACK) return null;
  return POR_VALOR.get(value) ?? null;
}

export function esTrack(value: string | null | undefined): boolean {
  return trackDe(value) !== null;
}

/** Vacío cuando no pertenece a ningún track. */
export function trackLabel(value: string | null | undefined): string {
  return trackDe(value)?.label ?? "";
}

export function trackCorto(value: string | null | undefined): string {
  return trackDe(value)?.corto ?? "";
}

export function trackColor(value: string | null | undefined): string {
  return trackDe(value)?.color ?? "border-surface-500 bg-surface-700 text-surface-100";
}

export function trackPublico(value: string | null | undefined): string {
  return trackDe(value)?.publico ?? "text-surface-300 border-surface-500/40 bg-surface-700/40";
}

export function trackHex(value: string | null | undefined, porDefecto: string = TEMA.acento): string {
  return trackDe(value)?.hex ?? porDefecto;
}

/** Para los desplegables del panel. «Sin track» va primero: es lo que toca a un bloque que no es charla. */
export const TRACKS_CON_VACIO: { value: string; label: string }[] = [
  { value: SIN_TRACK, label: "Sin track — no es una charla" },
  ...TRACKS.map(({ value, label }) => ({ value, label })),
];
