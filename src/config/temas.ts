import type { NombreTema, Tema } from "./tipos";

/**
 * Los temas de color.
 *
 * El diseño usa un solo acento sobre negro: bloques a sangre del color del
 * tema con texto oscuro encima, y el mismo color como acento sobre fondo negro.
 * Por eso cada tema tiene que cumplir dos contrastes, que `tests/temas.test.ts`
 * comprueba:
 *
 *   · `acento` contra negro, 7:1 o más: es fondo de texto.
 *   · `profundo` contra `acento`, 4.5:1 o más: es el acento que se usa encima.
 */
export const TEMAS: Record<NombreTema, Tema> = {
  lavanda: { acento: "#C9A9FF", claro: "#E0CCFF", fuerte: "#A87DFF", profundo: "#4C1D95" },
  platano: { acento: "#FFEC40", claro: "#FFF599", fuerte: "#F2D600", profundo: "#6B5200" },
  naranja: { acento: "#FF9900", claro: "#FFC266", fuerte: "#E88B00", profundo: "#6B3300" },
  menta:   { acento: "#7CF2B0", claro: "#B8F8D4", fuerte: "#3DDC84", profundo: "#0B5D36" },
  cielo:   { acento: "#7CC7FF", claro: "#B8E0FF", fuerte: "#3FA9F5", profundo: "#0B4A7A" },
  coral:   { acento: "#FF8A7A", claro: "#FFBDB3", fuerte: "#F2614D", profundo: "#7A1F12" },
  rosa:    { acento: "#FF9BD2", claro: "#FFC7E6", fuerte: "#F56BB5", profundo: "#7A1450" },
  lima:    { acento: "#C6F24E", claro: "#DFF89C", fuerte: "#A8D82A", profundo: "#3F5200" },
};

type RGB = [number, number, number];

export function aRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as RGB;
}

const aHex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

const mezclar = (a: RGB, b: RGB, t: number): RGB =>
  [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

function luminancia([r, g, b]: RGB): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Contraste WCAG entre dos colores, de 1 a 21. */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(aRgb(a)), luminancia(aRgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const NEGRO: RGB = [0, 0, 0];
const BLANCO: RGB = [255, 255, 255];

/**
 * Arma un tema entero a partir de un solo color.
 *
 * Si el color es demasiado oscuro para llevar texto negro encima se aclara
 * hasta que lo aguante, así que el resultado puede no ser exactamente el color
 * pedido: un azul marino no sirve de fondo de bloque en este diseño.
 */
export function derivarTema(hex: string): Tema {
  let base = aRgb(hex);
  for (let i = 0; i < 20 && contraste(aHex(base), "#000000") < 7; i++) {
    base = mezclar(base, BLANCO, 0.12);
  }
  const acento = aHex(base);

  let profundo = mezclar(base, NEGRO, 0.55);
  for (let i = 0; i < 20 && contraste(aHex(profundo), acento) < 5; i++) {
    profundo = mezclar(profundo, NEGRO, 0.12);
  }

  return {
    acento,
    claro: aHex(mezclar(base, BLANCO, 0.45)),
    fuerte: aHex(mezclar(base, NEGRO, 0.14)),
    profundo: aHex(profundo),
  };
}

export function resolverTema(tema: NombreTema | `#${string}` | Tema): Tema {
  if (typeof tema === "object") return tema;
  if (tema.startsWith("#")) return derivarTema(tema);
  const preset = TEMAS[tema as NombreTema];
  if (!preset) throw new Error(`evento/config.ts: el tema «${tema}» no existe. Opciones: ${Object.keys(TEMAS).join(", ")}.`);
  return preset;
}

/** Las variables CSS del tema, para ponerlas en `<html>`. */
export function variablesDeTema(t: Tema): Record<string, string> {
  return {
    "--tema-acento": t.acento,
    "--tema-acento-rgb": aRgb(t.acento).join(" "),
    "--tema-claro": t.claro,
    "--tema-fuerte": t.fuerte,
    "--tema-profundo": t.profundo,
  };
}
