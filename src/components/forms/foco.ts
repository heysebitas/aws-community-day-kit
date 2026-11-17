/** Lo mínimo que se usa de un elemento: así la función se prueba sin DOM. */
export interface Enfocable {
  focus: (opciones?: { preventScroll?: boolean }) => void;
}
export interface Raiz {
  querySelectorAll: (selector: string) => ArrayLike<Enfocable>;
}

const INVALIDO = '[aria-invalid="true"], [data-invalido="true"]';

/**
 * Lleva el foco al primer campo marcado como inválido, en orden del documento.
 * Se espera al siguiente cuadro: los errores se pintan tras el envío.
 */
export function enfocarPrimerInvalido(raiz: Raiz | null | undefined): void {
  if (!raiz) return;
  const buscar = () => raiz.querySelectorAll(INVALIDO)[0]?.focus();
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(buscar);
  else buscar();
}
