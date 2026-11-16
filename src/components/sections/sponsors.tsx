"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal } from "@/components/effects/scroll-reveal";
import { BlockSection } from "@/components/ui/block-section";
import { DotHeading } from "@/components/ui/dot-heading";
import { HardButton } from "@/components/ui/hard-button";
import { useMailto } from "@/components/ui/obfuscated-email";
import { useEventConfig } from "@/components/providers/event-config-provider";
import { patrocinadores } from "@evento/patrocinadores";
import { basePath } from "@/lib/utils";

/** Una fila de logos sueltos en tinta plana sobre el bloque. El tamaño lo da el nivel. */
function LogoRow({
  items,
  size,
  delay,
}: {
  items: typeof patrocinadores;
  size: "lead" | "mid" | "small";
  delay: number;
}) {
  if (!items.length) return null;

  const h =
    size === "lead" ? "h-16 md:h-24" : size === "mid" ? "h-10 md:h-14" : "h-7 md:h-9";
  const gap = size === "lead" ? "gap-10 md:gap-16" : "gap-8 md:gap-12";

  return (
    <ScrollReveal delay={delay} from="scale">
      <div className={`flex flex-wrap items-center justify-center ${gap}`}>
        {items.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center transition-transform duration-300 hover:-translate-y-1"
            aria-label={s.nombre}
          >
            {/* `brightness-0` aplana el logo a tinta: todos pesan lo mismo sobre el bloque. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${basePath}${s.logo}`}
              alt={s.nombre}
              width={400}
              height={200}
              loading="lazy"
              decoding="async"
              className={`${h} w-auto object-contain brightness-0 transition-opacity duration-300 group-hover:opacity-70`}
            />
          </a>
        ))}
      </div>
    </ScrollReveal>
  );
}

export function Sponsors() {
  const t = useTranslations("Sponsors");
  const { showSponsorsCta } = useEventConfig();
  const mailto = useMailto();

  const lead = patrocinadores.filter((s) => s.nivel === "diamond" || s.nivel === "platinum");
  const mid = patrocinadores.filter((s) => s.nivel === "gold");
  const small = patrocinadores.filter((s) => s.nivel === "community");

  return (
    <BlockSection id="sponsors" tone="block">
      <div className="text-center">
        <ScrollReveal>
          <DotHeading tone="block" variant="inverted" flicker>
            {t("heading")}
          </DotHeading>
        </ScrollReveal>
      </div>

      <div className="mt-14 space-y-14">
        <LogoRow items={lead} size="lead" delay={0.05} />
        <LogoRow items={mid} size="mid" delay={0.12} />
        <LogoRow items={small} size="small" delay={0.18} />
      </div>

      {showSponsorsCta && (
        <ScrollReveal delay={0.25}>
          <div className="mt-16 text-center">
            {/* La dirección se arma al pulsar: no va en un `href`, así que no está en el HTML. */}
            <HardButton
              tone="block"
              onClick={() => {
                window.location.href = mailto("patrocinios", t("mail_subject"));
              }}
            >
              {t("cta")}
            </HardButton>
          </div>
        </ScrollReveal>
      )}
    </BlockSection>
  );
}
