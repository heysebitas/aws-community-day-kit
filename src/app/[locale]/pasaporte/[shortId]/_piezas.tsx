"use client";

import { Foto } from "@/components/ui/foto";
import { useTranslations } from "next-intl";
import type { Sponsor } from "./_social";

/* ── CSS Animations (injected once as <style>) ── */
export const ANIM_CSS = `
@keyframes gradient-border {
  0%,100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
@keyframes breathe {
  0%,100% { opacity:.5; transform:translateX(-50%) scale(1); }
  50%      { opacity:.9; transform:translateX(-50%) scale(1.15); }
}
@keyframes pulse-ring {
  0%   { transform:scale(1);   opacity:.5; }
  100% { transform:scale(1.7); opacity:0; }
}
@keyframes stamp-appear {
  0%   { transform:scale(.4) rotate(-18deg); opacity:0; }
  75%  { transform:scale(1.06);              opacity:1; }
  100% { transform:scale(1);                 opacity:1; }
}
@keyframes fade-up {
  from { opacity:0; transform:translateY(20px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes owner-pulse {
  0%,100% { box-shadow:0 0 6px rgba(52,211,153,.4); }
  50%     { box-shadow:0 0 18px rgba(52,211,153,.7); }
}
@keyframes text-glow {
  0%,100% { text-shadow:0 0 20px rgb(var(--tema-acento-rgb) / .3); }
  50%     { text-shadow:0 0 45px rgb(var(--tema-acento-rgb) / .75); }
}
@keyframes spin { to { transform:rotate(360deg); } }
`;


export function Perf() {
  return (
    <div style={{ display: "flex", gap: 3, padding: "2px 18px", margin: "2px 0" }}>
      {Array.from({ length: 48 }).map((_, i) => (
        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "rgb(var(--tema-acento-rgb) / 0.14)", flexShrink: 0 }} />
      ))}
    </div>
  );
}

/** Un sello de la cuadrícula. */
export function StampItem({ sponsor, collected }: { sponsor: Sponsor; collected: boolean }) {
  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: "50%", padding: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        filter: collected ? "drop-shadow(0 0 10px rgba(255,255,255,.55))" : "grayscale(1) opacity(.2)",
        transition: "all .5s cubic-bezier(.34,1.56,.64,1)",
      }}>
        {sponsor.logoUrl ? (
          <Foto src={sponsor.logoUrl} alt={sponsor.sponsorName} width={120} height={120} sizes="120px" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontFamily: "monospace", fontSize: 8, color: "#6b7280", textAlign: "center", lineHeight: 1.2 }}>
            {sponsor.sponsorName}
          </span>
        )}
      </div>
    </div>
  );
}

export function PinDigits({ digits, onChange, hasError, disabled }: {
  digits: string[]; onChange: (d: string[]) => void; hasError?: boolean; disabled?: boolean;
}) {
  const t = useTranslations("Passport");
  const valor = digits.join("");
  // Un solo campo real: se puede pegar el PIN entero y el autorrelleno lo reconoce.
  // Las cuatro casillas son sólo dibujo encima de él.
  function handleChange(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 4);
    onChange([0, 1, 2, 3].map((i) => d[i] ?? ""));
  }
  return (
    <div style={{ position: "relative", display: "flex", gap: 8 }}>
      {[0, 1, 2, 3].map((i) => {
        const d = digits[i] ?? "";
        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              width: 52, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "monospace", fontSize: 22, fontWeight: 700,
              color: "var(--color-surface-50)", borderRadius: 14,
              border: hasError ? "1.5px solid rgba(239,68,68,.5)" : d ? "1.5px solid rgb(var(--tema-acento-rgb) / .7)" : "1.5px solid rgba(255,255,255,.12)",
              background: hasError ? "rgba(239,68,68,.05)" : d ? "rgb(var(--tema-acento-rgb) / .06)" : "rgba(255,255,255,.04)",
              transition: "all .2s", opacity: disabled ? .4 : 1,
            }}
          >{d}</span>
        );
      })}
      <input
        type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
        autoComplete="one-time-code" name="pin"
        aria-label={t("pin_label")}
        aria-invalid={hasError ? true : undefined}
        value={valor} disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        autoFocus
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: 0, fontSize: 16, border: 0, padding: 0,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </div>
  );
}
