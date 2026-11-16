"use client";

import { useLocale, useTranslations } from "next-intl";
import { ScrollReveal } from "@/components/effects/scroll-reveal";
import { DotHeading } from "@/components/ui/dot-heading";
import { labelOf, type Locale } from "@/data/attendee-form";
import { tracks } from "@evento/tracks";
import type { Track } from "@/config/contenido";

/**
 * La tarjeta de un track, dibujada con el tema: número en matriz de puntos,
 * título y temas. No es una imagen, así que cambia sola con el color y el idioma.
 */
function Tarjeta({ track, numero, locale }: { track: Track; numero: number; locale: Locale }) {
  const n = String(numero).padStart(2, "0");

  return (
    <article className="group relative flex aspect-[5/7] flex-col justify-between overflow-hidden border-2 border-surface-600 bg-surface-900 p-5 transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:border-acento hover:shadow-[8px_8px_0_0_var(--color-acento-fuerte)]">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-xs text-surface-200">Track {n} _</span>
        <span className="border-2 border-acento px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-acento">
          {labelOf(track.nivel, locale)}
        </span>
      </div>

      <span
        aria-hidden="true"
        className="dot-matrix block text-center text-[7.5rem] leading-none text-acento transition-transform duration-500 group-hover:scale-105 sm:text-[9rem] lg:text-[7rem] xl:text-[9rem]"
      >
        {n}
      </span>

      <div>
        <h3 className="m-0 font-display text-2xl font-bold uppercase leading-[0.95] tracking-tight text-surface-50 xl:text-3xl">
          {labelOf(track.titulo, locale)}
        </h3>
        <p className="mt-3 font-mono text-xs leading-relaxed text-acento">{track.temas.join(" · ")}</p>
      </div>
    </article>
  );
}

export function Tracks() {
  const t = useTranslations("Tracks");
  const locale = useLocale() as Locale;

  if (!tracks.length) return null;

  return (
    <section id="tracks" className="mx-auto max-w-[1180px] px-6 py-20 md:py-28">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-8 md:mb-14">
        <ScrollReveal>
          <DotHeading as="div" variant="inverted" className="mb-5 text-xl sm:text-2xl md:text-3xl">
            {t("eyebrow")}
          </DotHeading>
          <h2
            className="m-0 max-w-[16ch] font-display font-medium lowercase leading-[1.02] tracking-tight"
            style={{ fontSize: "clamp(28px,4vw,48px)" }}
          >
            {t("section_pre")}
            <em className="not-italic text-acento">{t("section_em")}</em>
            {t("section_post")}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <p className="m-0 max-w-[38ch] text-base leading-relaxed text-surface-300 md:text-lg">
            {t("section_lead")}
          </p>
        </ScrollReveal>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tracks.map((track, i) => (
          <ScrollReveal key={track.id} delay={i * 0.1} from="scale">
            <Tarjeta track={track} numero={i + 1} locale={locale} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
