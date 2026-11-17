"use client";

import { useState } from "react";
import { Foto } from "@/components/ui/foto";
import { avatarUrl } from "@/lib/avatar";

/** La carita de una persona en el panel. */

/** Tonos del tema para el bloque de iniciales, con la tinta que contrasta encima. */
const TONOS = [
  { bg: "var(--color-acento)", ink: "#000000" },
  { bg: "var(--color-acento-fuerte)", ink: "#000000" },
  { bg: "var(--color-acento-claro)", ink: "#000000" },
  { bg: "#7C4DFF", ink: "#FFFFFF" },
  { bg: "var(--color-acento-profundo)", ink: "#FFFFFF" },
  { bg: "#B0B0C0", ink: "#000000" },
] as const;

/** Hash estable: la misma persona cae siempre en el mismo tono. */
function tonoDe(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONOS[h % TONOS.length]!;
}

function iniciales(name: string, email: string): string {
  const partes = name.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0]![0]! + partes[1]![0]!).toUpperCase();
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (email.trim()[0] ?? "?").toUpperCase();
}

export function Avatar({
  seed,
  name = "",
  email = "",
  photo,
  size = 44,
  className = "",
}: {
  /**
   * Qué dibujo le toca. Debe ser estable para la persona: el `qrCode` de un
   * asistente, el correo de un voluntario. Si falta, se usa el correo.
   */
  seed?: string;
  name?: string;
  email?: string;
  /** URL de una foto real, si la hay. */
  photo?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const tono = tonoDe(seed || email || name || "?");
  const semilla = seed || email || name;

  const box = `inline-flex shrink-0 items-center justify-center overflow-hidden border-2 border-surface-100/20 ${className}`;

  if (photo) {
    return (
      <span className={box} style={{ width: size, height: size, background: "#16161F" }}>
        <Foto src={photo} alt="" width={size} height={size} className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={box}
      style={{ width: size, height: size, background: tono.bg }}
      aria-hidden="true"
    >
      {semilla && !failed ? (
        // Plano y no `next/image`: son SVG y el dominio no está en
        // `remotePatterns` a propósito (ver src/lib/avatar.ts). Mientras carga
        // se ve el bloque de color, no un hueco.
        <img
          src={avatarUrl(semilla)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="font-mono font-bold leading-none"
          style={{ color: tono.ink, fontSize: Math.round(size * 0.38) }}
        >
          {iniciales(name, email)}
        </span>
      )}
    </span>
  );
}
