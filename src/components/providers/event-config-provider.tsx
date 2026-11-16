"use client";

import { createContext, useContext } from "react";
import type { PublicEventConfig } from "@/lib/data/event-config";
import type { BuzonesCodificados } from "@/lib/buzones";

/**
 * Lo que el sitio público necesita saber y no está en el código: qué
 * formularios están abiertos, los enlaces que se editan desde el panel y los
 * buzones de contacto. El layout lo lee una vez en el servidor y lo reparte
 * por contexto.
 */
export type ConfigDelSitio = PublicEventConfig & { buzones: BuzonesCodificados };

const Contexto = createContext<ConfigDelSitio | null>(null);

export function EventConfigProvider({ value, children }: { value: ConfigDelSitio; children: React.ReactNode }) {
  return <Contexto.Provider value={value}>{children}</Contexto.Provider>;
}

const RESPALDO: ConfigDelSitio = {
  trackVirtualUrl: "",
  photosUrl: "",
  recordingsUrl: "",
  notifyUrl: "",
  showSponsorsCta: true,
  showSpeakerCta: true,
  attendeeOpen: false,
  volunteerOpen: false,
  cfpOpen: false,
  buzones: { general: "", privacidad: "", patrocinios: "" },
};

export function useEventConfig(): ConfigDelSitio {
  return useContext(Contexto) ?? RESPALDO;
}
