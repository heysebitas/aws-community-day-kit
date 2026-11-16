"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Diálogo modal nativo: `showModal()` deja el resto de la página inerte (el foco
 * no se escapa con Tab) y avisa de Escape con el evento `cancel`. Esta es la
 * única implementación de Escape; los modales no escuchan teclas.
 */

export type DialogoEl = Pick<HTMLDialogElement, "open" | "showModal" | "close" | "addEventListener" | "removeEventListener">;

/** Abre el diálogo y devuelve cómo cerrarlo; al cerrar el foco vuelve a donde estaba. */
export function vincularDialogo(
  dialogo: DialogoEl,
  onClose: () => void,
  doc: Pick<Document, "activeElement"> = document,
): () => void {
  const disparador = doc.activeElement as HTMLElement | null;

  const alCancelar = (e: Event) => {
    // Quien manda es el estado del componente: él lo desmonta.
    e.preventDefault();
    onClose();
  };
  dialogo.addEventListener("cancel", alCancelar);
  if (!dialogo.open) dialogo.showModal();

  return () => {
    dialogo.removeEventListener("cancel", alCancelar);
    if (dialogo.open) dialogo.close();
    if (disparador && disparador.isConnected && typeof disparador.focus === "function") {
      disparador.focus({ preventScroll: true });
    }
  };
}

/** Pasa el `ref` al `<dialog>`: se abre al montarse y se cierra al desmontarse. */
export function useDialogo(onClose: () => void): RefObject<HTMLDialogElement | null> {
  const ref = useRef<HTMLDialogElement>(null);
  const cierre = useRef(onClose);
  useEffect(() => {
    cierre.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return vincularDialogo(el, () => cierre.current());
  }, []);

  return ref;
}

/** Clases del `<dialog>` para que ocupe la pantalla sin pintar nada propio. */
export const CLASE_DIALOGO =
  "fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-visible border-0 bg-transparent p-0 text-inherit backdrop:bg-transparent";
