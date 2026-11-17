"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/effects/scroll-reveal";
import { DotHeading } from "@/components/ui/dot-heading";
import { keynotes } from "@evento/keynotes";
import type { Keynote } from "@/config/contenido";
import { localePath } from "@/lib/utils";

function LinkedinIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

/* ── Body content shared by both card types ── */
function KeynoteBody({ kn, size = "sm" }: { kn: Keynote; size?: "sm" | "lg" }) {
  const padding   = size === "lg" ? "p-8 md:p-12" : "p-6 md:p-9";
  const nameSize  = size === "lg" ? "clamp(1.75rem,3.8vw,2.875rem)" : "clamp(1.375rem,3.2vw,2.375rem)";
  const roleText  = size === "lg" ? "text-base md:text-lg text-surface-300" : "text-sm text-surface-400";
  const talkTitle = size === "lg" ? "text-lg md:text-xl" : "text-base";

  return (
    <div className={`relative z-10 ${padding} flex flex-col justify-center gap-${size === "lg" ? "5" : "4"}`}>
      <span className={`self-start etiqueta text-acento bg-acento/10 border-2 border-acento ${size === "lg" ? "px-4 py-1.5" : "px-3 py-1"}`}>
        Keynote
      </span>

      <div>
        <h3 className="font-display font-semibold leading-none tracking-tight text-surface-50 m-0"
          style={{ fontSize: nameSize }}>
          {kn.nombre}<br />{kn.apellido}
        </h3>
        {(kn.cargo || kn.empresa) && (
          <p className={`${roleText} m-0 flex flex-wrap items-center gap-2 mt-2`}>
            {kn.cargo && <span>{kn.cargo}</span>}
            {kn.cargo && kn.empresa && <span className="text-acento">·</span>}
            {kn.empresa && <span>{kn.empresa}</span>}
          </p>
        )}
      </div>

      {kn.tipoCharla && (
        <div className="border-t-2 border-surface-700 pt-4 flex flex-col gap-1.5">
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-surface-300">
            {kn.tipoCharla}
          </span>
          {kn.tituloCharla && (
            <span className={`font-mono italic text-surface-200 ${talkTitle}`}>
              {kn.tituloCharla}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-1">
        {kn.linkedin && (
          <Link
            href={kn.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`self-start inline-flex items-center gap-1.5 text-surface-400 hover:text-acento transition-colors font-mono tracking-wide ${size === "lg" ? "text-sm" : "text-xs"}`}
          >
            <LinkedinIcon className={size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"} />
            LinkedIn
          </Link>
        )}
        {kn.perfil && (
          <Link
            href={`/speakers/${kn.perfil}`}
            onClick={(e) => e.stopPropagation()}
            className={`self-start inline-flex items-center gap-1.5 font-mono font-semibold text-acento border-2 border-acento/40 bg-acento/8 transition-all hover:bg-acento hover:text-surface-900 ${size === "lg" ? "text-sm px-4 py-1.5" : "text-xs px-3 py-1"}`}
          >
            Ver perfil completo
            <ArrowRight className={size === "lg" ? "w-4 h-4" : "w-3 h-3"} />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Headliner card — full width, large ── */
function HeadlinerCard({ kn }: { kn: Keynote }) {
  const router = useRouter();
  return (
    <div className="relative">
      <article
        className={`relative grid grid-cols-1 md:grid-cols-[0.92fr_1.08fr] border-2 border-surface-600 overflow-hidden bg-surface-800/60 isolate shadow-[6px_6px_0_0_rgb(var(--tema-acento-rgb)/0.35)] transition-colors duration-300 ${kn.perfil ? "hover:border-acento/50 cursor-pointer" : ""}`}
        onClick={() => kn.perfil && router.push(`/speakers/${kn.perfil}`)}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_0%,rgb(var(--tema-acento-rgb)_/_0.07),transparent_45%)] pointer-events-none z-0" />

        {kn.delPrograma && (
          <div className="absolute top-4 right-4 z-20 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logos/aws-logo.svg" alt="AWS" width={304} height={182} loading="lazy" decoding="async" className="h-6 w-auto opacity-90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" />
          </div>
        )}

        {/* Photo */}
        <div className="relative min-h-[320px] md:min-h-[460px] bg-surface-900">
          {kn.foto ? (
            <>
              <Image
                src={kn.foto}
                alt={`${kn.nombre} ${kn.apellido}`}
                fill
                className="object-cover object-[50%_22%]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 hidden md:block" style={{
                background: "linear-gradient(105deg, transparent 50%, #0c0d10 99%), linear-gradient(0deg, rgba(0,0,0,0.45), transparent 42%)"
              }} />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-800/90 md:hidden" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface-700 to-surface-900 flex items-center justify-center">
              <span aria-hidden="true" className="font-mono font-bold text-surface-600 select-none" style={{ fontSize: "clamp(4rem,10vw,7.5rem)" }}>
                {kn.nombre[0]}{kn.apellido[0]}
              </span>
            </div>
          )}
        </div>

        <KeynoteBody kn={kn} size="lg" />
      </article>
    </div>
  );
}

/* ── Tarjeta secundaria: mismas proporciones, sombra más corta ── */
function SecondaryCard({ kn }: { kn: Keynote }) {
  const router = useRouter();
  return (
    <div className="relative w-full h-full">
      <article
        className={`relative grid grid-cols-1 md:grid-cols-[0.92fr_1.08fr] border-2 border-surface-600 overflow-hidden bg-surface-800/60 h-full isolate shadow-[4px_4px_0_0_rgb(var(--tema-acento-rgb)/0.2)] transition-colors duration-300 ${kn.perfil ? "hover:border-acento/50 cursor-pointer" : ""}`}
        onClick={() => kn.perfil && router.push(`/speakers/${kn.perfil}`)}
      >
        {kn.delPrograma && (
          <div className="absolute top-4 right-4 z-20 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logos/aws-logo.svg" alt="AWS" width={304} height={182} loading="lazy" decoding="async" className="h-6 w-auto opacity-90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" />
          </div>
        )}

        {/* Photo — same height as headliner */}
        <div className="relative min-h-[320px] md:min-h-[460px] bg-surface-900">
          {kn.foto ? (
            <>
              <Image
                src={kn.foto}
                alt={`${kn.nombre} ${kn.apellido}`}
                fill
                className="object-cover object-[50%_18%]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 hidden md:block" style={{
                background: "linear-gradient(105deg, transparent 50%, #0c0d10 99%), linear-gradient(0deg, rgba(0,0,0,0.4), transparent 40%)"
              }} />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-800/90 md:hidden" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-surface-700 to-surface-900 flex items-center justify-center">
              <span aria-hidden="true" className="font-mono font-bold text-surface-600 select-none" style={{ fontSize: "clamp(3rem,7vw,5.5rem)" }}>
                {kn.nombre[0]}{kn.apellido[0]}
              </span>
            </div>
          )}
        </div>

        <KeynoteBody kn={kn} size="sm" />
      </article>
    </div>
  );
}

/* ── Main section ── */
export function Keynotes() {
  const t = useTranslations("Keynotes");
  const locale = useLocale();
  const [headliner, ...rest] = keynotes;

  if (!headliner) return null;

  return (
    /* Mismo espaciado y misma cabecera que «Por qué asistir»: van seguidas en la portada. */
    <section id="keynotes" className="mx-auto max-w-[1180px] px-6 seccion-m">
      {/* Section head */}
      <div className="flex flex-wrap items-end justify-between gap-8 mb-10 md:mb-14">
        <ScrollReveal>
          <DotHeading as="div" variant="inverted" className="mb-5 text-xl sm:text-2xl md:text-3xl">
            {t("eyebrow")}
          </DotHeading>
          <h2
            className="font-display font-medium lowercase leading-[1.02] tracking-tight max-w-[16ch] m-0"
            style={{ fontSize: "clamp(1.75rem,4vw,3rem)" }}
          >
            {t("section_pre")}
            <em className="not-italic text-acento">{t("section_em")}</em>
            {t("section_post")}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="flex flex-col items-start gap-4">
            <p className="text-surface-300 leading-relaxed max-w-[38ch] m-0 text-base md:text-lg">
              {t("speakers_cta_desc")}
            </p>
            <Link
              href={localePath(locale, "/directorio")}
              className="inline-flex items-center gap-2 font-mono text-sm font-semibold text-acento border-2 border-acento/40 bg-acento/8 px-5 py-2.5 transition-all duration-300 hover:bg-acento hover:text-surface-900 hover:border-acento group"
            >
              {t("speakers_cta_btn")}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>
      </div>

      <div className="flex flex-col gap-4">
        {/* Headliner — always full width */}
        <ScrollReveal>
          <HeadlinerCard kn={headliner} />
        </ScrollReveal>

        {/* 1 secondary → full width */}
        {rest.length === 1 && (
          <ScrollReveal delay={0.08}>
            <SecondaryCard kn={rest[0]} />
          </ScrollReveal>
        )}

        {/* 2+ secondaries → grid */}
        {rest.length >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rest.map((kn, i) => (
              <ScrollReveal key={i} delay={(i + 1) * 0.08} className="flex">
                <SecondaryCard kn={kn} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
