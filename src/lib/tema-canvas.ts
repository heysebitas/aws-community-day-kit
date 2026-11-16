/**
 * El acento del tema, para dibujar en un `<canvas>`.
 *
 * Dentro de un canvas no se pueden usar variables CSS, así que se lee la que
 * hay puesta en `<html>`. Devuelve los canales separados por comas, listos para
 * `rgba(${acento},0.5)`.
 */
export function acentoCanvas(): string {
  if (typeof document === "undefined") return "255,153,0";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--tema-acento-rgb").trim();
  return v ? v.split(/\s+/).join(",") : "255,153,0";
}
