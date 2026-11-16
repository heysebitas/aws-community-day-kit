"use client";

import { useEventConfig } from "@/components/providers/event-config-provider";
import { useHydrated } from "@/hooks/use-hydrated";
import { rot13, type Buzon } from "@/lib/buzones";

/** Devuelve cómo armar el `mailto:` de un buzón. La dirección sólo existe al llamar. */
export function useMailto() {
  const { buzones } = useEventConfig();
  return (box: Buzon, subject?: string): string => {
    const address = rot13(buzones[box]);
    return subject ? `mailto:${address}?subject=${encodeURIComponent(subject)}` : `mailto:${address}`;
  };
}

/** Un correo de contacto que no está escrito en el HTML servido. */
export function ObfuscatedEmail({
  box = "general",
  className,
  subject,
}: {
  box?: Buzon;
  className?: string;
  /** Asunto sugerido al abrir el cliente de correo. */
  subject?: string;
}) {
  const hydrated = useHydrated();
  const { buzones } = useEventConfig();
  const mailto = useMailto();
  const address = rot13(buzones[box]);
  if (!address) return null;

  if (!hydrated) {
    const [user, domain = ""] = address.split("@");
    return (
      <span className={className}>
        {user} arroba {domain.split(".").join(" punto ")}
      </span>
    );
  }

  return (
    <a className={className} href={mailto(box, subject)}>
      {address}
    </a>
  );
}
