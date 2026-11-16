"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ScrollReveal } from "@/components/effects/scroll-reveal";
import { CodeLines, type CodeParagraph } from "@/components/effects/code-lines";
import { CountPictogram } from "@/components/effects/count-pictogram";
import { BlockSection } from "@/components/ui/block-section";
import { DotHeading } from "@/components/ui/dot-heading";
import { EVENTO } from "@/config";
import { tracks } from "@evento/tracks";

/** Las cifras de la derecha, que salen de la configuración. Los monitos son de adorno: uno por cada centenar, por track o por decena. */
const COUNTS = [
  { glyph: "person", count: Math.min(5, Math.max(1, Math.round(EVENTO.cupos / 100))), key: "stat_attendees", value: `${EVENTO.cupos}+` },
  { glyph: "cloud", count: Math.min(6, tracks.length), key: "stat_tracks", value: String(tracks.length) },
  ...(EVENTO.detalles.speakers
    ? [{ glyph: "star", count: Math.min(5, Math.max(1, Math.round(EVENTO.detalles.speakers / 5))), key: "stat_speakers", value: `${EVENTO.detalles.speakers}+` } as const]
    : []),
] as const;

export function About() {
  const t = useTranslations("About");

  // El texto se arma como párrafos con segmentos: los `accent` se resaltan
  // dentro del bloque numerado.
  const paragraphs = useMemo<CodeParagraph[]>(
    () => [
      [{ text: t("description") }],
      [
        { text: t("code_p2_pre") },
        { text: t("code_p2_em"), accent: true },
        { text: t("code_p2_post") },
      ],
      [{ text: t("code_p3_pre") }, { text: t("code_p3_em"), accent: true }],
    ],
    [t],
  );

  return (
    <BlockSection id="about" tone="block">
      <ScrollReveal>
        <DotHeading tone="block" variant="inverted" flicker className="mb-10">
          {t("heading")}
        </DotHeading>
      </ScrollReveal>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <ScrollReveal delay={0.1}>
          <CodeLines paragraphs={paragraphs} tone="block" />
        </ScrollReveal>

        {/* Filas de conteo */}
        <div className="flex flex-col justify-center gap-7">
          {COUNTS.map((c, i) => (
            <ScrollReveal key={c.key} delay={0.15 + i * 0.1} from="right" distance={60}>
              <CountPictogram
                glyph={c.glyph}
                count={c.count}
                label={`${c.value} ${t(c.key)}`}
                tone="block"
              />
            </ScrollReveal>
          ))}

          <ScrollReveal delay={0.4}>
            <div className="mt-2 inline-flex items-baseline gap-4 border-t-2 border-tinta pt-5">
              <span className="font-display text-6xl font-medium leading-none text-tinta md:text-7xl">
                $0
              </span>
              <span className="dot-matrix text-2xl leading-none text-tinta md:text-3xl">
                {t("stat_cost")}
              </span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </BlockSection>
  );
}
