"use client";

import { useSyncExternalStore } from "react";
import { esModesto } from "@/lib/dispositivo";

const sinSuscripcion = () => () => {};

/** Dispositivo o red modestos; falso en el servidor y en la hidratación. */
export function useModesto() {
  return useSyncExternalStore(sinSuscripcion, () => esModesto(), () => false);
}
