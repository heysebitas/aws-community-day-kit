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

/**
 * Avisa cuando cambia el acento de `<html>` (la vista previa `?tema=` o
 * cualquier cambio en vivo), para que un canvas ya montado se repinte con el
 * color nuevo. Devuelve la función que deja de observar.
 */
export function observarAcento(alCambiar: (acento: string) => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  let actual = acentoCanvas();
  const obs = new MutationObserver(() => {
    const nuevo = acentoCanvas();
    if (nuevo !== actual) alCambiar((actual = nuevo));
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
  return () => obs.disconnect();
}
