"use client";

import { useRef } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { motion, useScroll, useTransform } from "motion/react";
import { basePath, localePath } from "@/lib/utils";
import { useEventConfig } from "@/components/providers/event-config-provider";
import { EVENTO } from "@/config";

/** CTA de registro montado dentro de una máquina arcade. */
export function RegistrationCTA() {
  const t = useTranslations("Registration");
  const { attendeeOpen } = useEventConfig();
  const locale = useLocale();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });

  // El zoom va ligado al scroll: la escena se acerca y el mueble se desvanece
  // para que al final sólo quede la pantalla.
  const scale = useTransform(scrollYProgress, [0, 0.75], [0.72, 1.18]);
  const cabinetOpacity = useTransform(scrollYProgress, [0.35, 0.8], [1, 0]);
  const glow = useTransform(scrollYProgress, [0, 0.8], [0.15, 0.6]);

  return (
    <section
      ref={ref}
      id="register"
      className="relative overflow-hidden bg-surface-900 px-6 py-24 md:py-32"
    >
      {/* Rejilla de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--tema-acento-rgb) / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--tema-acento-rgb) / 0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        style={{ scale }}
        className="relative mx-auto w-full max-w-[760px] origin-center"
      >
        {/* Mueble */}
        <motion.div style={{ opacity: cabinetOpacity }} aria-hidden="true">
          {/* Laterales */}
          <div className="absolute -left-6 top-6 h-[92%] w-6 bg-acento/70 sm:-left-10 sm:w-10" />
          <div className="absolute -right-6 top-6 h-[92%] w-6 bg-acento/70 sm:-right-10 sm:w-10" />
          {/* Marquesina */}
          <div className="mx-auto mb-3 w-[86%] border-2 border-acento bg-acento px-4 py-2 text-center">
            <span className="dot-matrix text-lg leading-none text-tinta sm:text-2xl">
              {EVENTO.nombre} · {EVENTO.anio}
            </span>
          </div>

        </motion.div>

        {/* Pantalla */}
        <motion.div
          style={{ boxShadow: useTransform(glow, (g) => `0 0 80px rgb(var(--tema-acento-rgb) / ${g})`) }}
          className="relative border-2 border-acento bg-black p-6 sm:p-10"
        >
          {/* Líneas de barrido del tubo */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgb(var(--tema-acento-rgb) / 0.16) 0px, rgb(var(--tema-acento-rgb) / 0.16) 1px, transparent 1px, transparent 3px)",
            }}
          />

          <div className="relative text-center">
            <p className="dot-matrix text-sm text-acento/70 sm:text-base">
              {"// "}
              {t("description")}
            </p>

            <h2 className="dot-matrix mt-5 text-3xl leading-none text-acento sm:text-5xl md:text-6xl">
              {t("heading")}
            </h2>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <span className="dot-matrix text-sm text-surface-300">
                {EVENTO.cupos}+ cupos
              </span>
              <span className="dot-matrix text-sm text-surface-300">{t("free")}</span>
            </div>

            {/* Con el registro cerrado deja de ser un enlace y lo dice, igual que en la portada. */}
            {attendeeOpen ? (
              <a
                href={localePath(locale, "/registro")}
                className="mt-8 inline-flex items-center justify-center border-2 border-acento bg-acento px-10 py-4 text-tinta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--color-acento-fuerte)]"
              >
                <span className="dot-matrix text-lg leading-none sm:text-xl">
                  &gt;&gt; {t("cta")} &lt;&lt;
                </span>
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="mt-8 inline-flex cursor-not-allowed flex-col items-center justify-center border-2 border-acento/40 px-10 py-4 text-acento/50"
              >
                <span className="dot-matrix text-lg leading-none sm:text-xl">{t("cta_closed")}</span>
                <span className="dot-matrix mt-1.5 text-[11px] leading-none">{t("closed_note")}</span>
              </span>
            )}
          </div>
        </motion.div>

        {/* Panel de controles */}
        <motion.div style={{ opacity: cabinetOpacity }} aria-hidden="true" className="mt-3">
          <div className="mx-auto flex w-[92%] items-center justify-center gap-8 border-2 border-acento/60 bg-surface-800 px-6 py-6 sm:gap-14">
            {/* Palancas */}
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-6 w-1.5 bg-acento/60" />
                <div className="-mt-1 h-5 w-5 rounded-full bg-acento" />
              </div>
            ))}
            {/* Botones */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="h-3.5 w-3.5 rounded-full bg-acento/70"
                  style={{ animation: `pulse-subtle 2.4s ease-in-out ${i * 0.18}s infinite` }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* La mascota de la edición, pegada al mueble. */}
        {EVENTO.marca.mascota && <motion.div
          style={{ opacity: cabinetOpacity }}
          aria-hidden="true"
          /*
           * En pantalla pequeña va metida hacia dentro: el mueble crece con el scroll y
           * lo que cuelga del borde se sale del encuadre.
           */
          className="pointer-events-none absolute -bottom-4 left-8 z-30 -rotate-6 sm:-bottom-8 sm:-left-14"
        >
          <div className="border-2 border-acento bg-surface-900 p-1.5 shadow-[6px_6px_0_0_rgba(0,0,0,0.55)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}${EVENTO.marca.mascota}`} alt="" width={400} height={400} loading="lazy" decoding="async" className="h-[88px] w-auto sm:h-[120px] lg:h-[138px]" />
          </div>
        </motion.div>}
      </motion.div>
    </section>
  );
}
