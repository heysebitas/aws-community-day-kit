/**
 * Bucle de `requestAnimationFrame` que sólo corre mientras el elemento está en
 * pantalla. Un canvas oculto con `display: none` nunca se cruza con la
 * ventana, así que tampoco arranca. Devuelve la función que lo para.
 */
export function bucleVisible(el: Element, fotograma: () => void): () => void {
  let raf = 0;
  let visible = false;
  const tick = () => {
    raf = 0;
    if (!visible) return;
    fotograma();
    raf = requestAnimationFrame(tick);
  };
  const centinela = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    },
    { rootMargin: "100px" },
  );
  centinela.observe(el);
  return () => {
    centinela.disconnect();
    cancelAnimationFrame(raf);
  };
}
