"use client";

import { useSyncExternalStore } from "react";

/** Nunca hay cambios que notificar: el valor sólo depende de dónde se ejecuta. */
const subscribe = () => () => {};

/**
 * `false` durante el render del servidor y la primera pintura; `true` en cuanto
 * la página está hidratada.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
