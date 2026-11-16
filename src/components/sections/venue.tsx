"use client";

import { useLocale, useTranslations } from "next-intl";
import { MapPin, Wifi, Users } from "lucide-react";
import { ScrollReveal } from "@/components/effects/scroll-reveal";
import { WireCiudad } from "@/components/effects/wire-ciudad";
import { DotHeading } from "@/components/ui/dot-heading";
import { BlockSection } from "@/components/ui/block-section";
import { HardButton } from "@/components/ui/hard-button";
import { EVENTO } from "@/config";
import { coordenadas } from "@/config/fechas";

export function Venue() {
  const t = useTranslations("Venue");
  const locale = useLocale();
  const { presencial, online } = EVENTO.modalidad;
  const silueta = EVENTO.sede.silueta ?? "auto";

  const filas = [
    presencial && { icon: Users, title: t("mode_onsite"), desc: t("mode_onsite_desc") },
    online && { icon: Wifi, title: t("mode_online"), desc: t("mode_online_desc") },
    presencial && { icon: MapPin, title: EVENTO.sede.nombre, desc: EVENTO.sede.direccion },
  ].filter((f): f is { icon: typeof Users; title: string; desc: string } => !!f);

  return (
    <BlockSection id="venue" tone="ink">
      <ScrollReveal>
        <DotHeading variant="inverted" flicker className="mb-10">
          {t("heading")}
        </DotHeading>
      </ScrollReveal>

      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <ScrollReveal>
            <p className="dot-matrix text-sm text-surface-400">{coordenadas(locale)}</p>
            <h3 className="mt-2 font-display text-5xl font-medium lowercase leading-[0.95] tracking-tighter text-surface-50 md:text-6xl">
              {EVENTO.ciudad}
            </h3>
            <p className="mt-4 max-w-[42ch] font-mono text-base leading-relaxed text-surface-300">
              {t(presencial && online ? "subheading" : online ? "subheading_online" : "subheading_onsite")}
            </p>
          </ScrollReveal>

          {EVENTO.fecha.confirmada && (
            <ScrollReveal delay={0.1}>
              <p className="mt-6 inline-block border-2 border-acento px-4 py-2 font-mono text-sm font-semibold text-acento">
                {t("date_label")}
              </p>
            </ScrollReveal>
          )}

          <div className="mt-10 space-y-px border-t border-surface-700">
            {filas.map((row, i) => (
              <ScrollReveal key={row.title} delay={0.15 + i * 0.1} from="left" distance={60}>
                <div className="group flex items-start gap-4 border-b border-surface-700 py-5 transition-colors duration-300 hover:bg-surface-800/60">
                  <row.icon className="mt-0.5 h-5 w-5 shrink-0 text-acento" />
                  <div>
                    <p className="m-0 font-display text-lg font-medium lowercase tracking-tight text-surface-50">
                      {row.title}
                    </p>
                    <p className="mt-0.5 font-mono text-sm leading-relaxed text-surface-400">{row.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {silueta !== "ninguna" && (
          <ScrollReveal delay={0.2} from="scale">
            <div className="relative mx-auto w-full max-w-[520px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-acento/10 blur-3xl"
              />
              <WireCiudad silueta={silueta} ciudad={EVENTO.ciudad} className="relative h-[420px] w-full md:h-[520px]" />
              <p className="dot-matrix mt-1 text-center text-[11px] text-surface-500 sm:text-xs">
                {EVENTO.sede.siluetaPie ?? EVENTO.ciudad}
              </p>
            </div>
          </ScrollReveal>
        )}
      </div>

      {presencial && (
        <ScrollReveal delay={0.3}>
          <div className="mt-12">
            <HardButton href={EVENTO.sede.mapa} variant="outline" external>
              {t("directions")}
            </HardButton>
          </div>
        </ScrollReveal>
      )}
    </BlockSection>
  );
}
