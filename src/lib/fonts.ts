import { Handjet, JetBrains_Mono, Oxanium } from "next/font/google";

// Sólo el subconjunto `latin`: cubre español, portugués e inglés enteros.

/** Texto del sitio. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

/** Titulares (`font-display`). */
export const oxanium = Oxanium({
  subsets: ["latin"],
  variable: "--font-oxanium",
  display: "swap",
});

/**
 * Letreros de matriz de puntos (`.dot-matrix`). Es variable: el eje ELSH
 * redondea el punto y ELGR fija la densidad de la grilla; se piden en CSS.
 */
export const handjet = Handjet({
  subsets: ["latin"],
  axes: ["ELGR", "ELSH"],
  weight: "variable",
  variable: "--font-handjet",
  display: "swap",
});
