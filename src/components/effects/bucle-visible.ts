/**
 * Bucle de `requestAnimationFrame` que sólo corre mientras el elemento está en
 * pantalla y mide algo. Un canvas oculto con `display: none` nunca se cruza
 * con la ventana, y uno de ancho 0 espera al `ResizeObserver` en vez de pedir
 * fotogramas en balde. Con `una` (movimiento reducido) pinta una vez al verse
 * y otra al cambiar de tamaño, sin bucle. Devuelve la función que lo para.
 */
export function bucleVisible(el: Element, fotograma: () => void, una = false): () => void {
  let raf = 0;
  let visible = false;
  const medido = () => el.clientWidth > 0 && el.clientHeight > 0;
  const tick = () => {
    raf = 0;
    if (!visible || !medido()) return;
    fotograma();
    if (!una) raf = requestAnimationFrame(tick);
  };
  const arrancar = () => {
    if (visible && !raf && medido()) raf = requestAnimationFrame(tick);
  };
  const centinela = new IntersectionObserver(
    ([e]) => {
      visible = e!.isIntersecting;
      arrancar();
    },
    { rootMargin: "100px" },
  );
  centinela.observe(el);
  // Cambiar el tamaño vacía el canvas: en modo de una sola pintura se repinta.
  const tamano = new ResizeObserver(() => {
    if (una && raf) return;
    arrancar();
  });
  tamano.observe(el);
  return () => {
    centinela.disconnect();
    tamano.disconnect();
    cancelAnimationFrame(raf);
  };
}
