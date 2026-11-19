"use client";

import { useCallback, useSyncExternalStore } from "react";
import { esModesto } from "@/lib/dispositivo";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Movimiento reducido: la preferencia del sistema o un dispositivo modesto. */
export function useReducedMotion() {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(QUERY);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches || esModesto(),
    () => false, // en el servidor se asume que no hay preferencia
  );
}
