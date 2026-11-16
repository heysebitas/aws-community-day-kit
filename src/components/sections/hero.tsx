"use client";

import { useTranslations, useLocale } from "next-intl";
import { motion } from "motion/react";
import { useEventConfig } from "@/components/providers/event-config-provider";
import { WireGlobe } from "@/components/effects/wire-globe";
import { MarqueeStrip } from "@/components/ui/marquee-strip";
import { HardButton } from "@/components/ui/hard-button";
import { useCountdown } from "@/hooks/use-countdown";
import { EVENTO } from "@/config";
import { coordenadas, fechaCorta, hora } from "@/config/fechas";
import { localePath } from "@/lib/utils";

// El hero no se desvanece al entrar: el <h1> es el elemento que mide el LCP y
// con `opacity: 0` en el HTML del servidor no se pinta hasta que React hidrata.
// El texto entra deslizando, pero visible desde el primer momento.

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="border-2 border-surface-500 bg-surface-800 px-3 py-2 sm:px-4 sm:py-2.5">
        <span className="dot-matrix block text-4xl leading-none text-acento sm:text-5xl md:text-6xl">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="etiqueta mt-2 text-surface-400">{label}</span>
    </div>
  );
}

function HeroCountdown() {
  const t = useTranslations("Hero");
  const { days, hours, minutes, seconds, isExpired, isPostEvent, isActive } = useCountdown(EVENTO.inicio);

  // Hasta el primer tick en el cliente se reserva la altura, para que el hero no salte.
  if (!isActive) return <div className="h-[112px] md:h-[132px]" aria-hidden="true" />;

  if (isPostEvent) {
    return <p className="dot-matrix text-2xl text-acento md:text-4xl">{t("post_desc")}</p>;
  }
  if (isExpired) {
    return <p className="dot-matrix animate-flicker text-3xl text-acento md:text-5xl">{t("event_day_title")}</p>;
  }

  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <Digit value={days} label={t("days")} />
      <Digit value={hours} label={t("hours")} />
      <Digit value={minutes} label={t("minutes")} />
      <Digit value={seconds} label={t("seconds")} />
    </div>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

/** El nombre partido en dos renglones: «aws student» / «community day». */
function renglones(nombre: string): [string, string] {
  const palabras = nombre.toLowerCase().split(/\s+/);
  const corte = Math.ceil(palabras.length / 2);
  return [palabras.slice(0, corte).join(" "), palabras.slice(corte).join(" ")];
}

export function Hero() {
  const t = useTranslations("Hero");
  const tCinta = useTranslations("Strip");
  const locale = useLocale();
  const { isExpired, isPostEvent } = useCountdown(EVENTO.inicio);
  const {
    trackVirtualUrl, photosUrl, recordingsUrl, notifyUrl,
    showSpeakerCta, attendeeOpen, volunteerOpen, cfpOpen,
  } = useEventConfig();
  const [arriba, abajo] = renglones(EVENTO.nombre);
  const confirmada = EVENTO.fecha.confirmada;

  return (
    <section id="home" className="relative flex min-h-screen flex-col overflow-hidden bg-surface-900">
      <div className="relative z-10 mx-auto grid w-full max-w-[1240px] flex-1 grid-cols-1 items-center gap-8 px-6 pb-10 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
        <div className="order-2 lg:order-1">
          <motion.p
            initial={{ y: 14 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="dot-matrix flex flex-wrap gap-x-6 gap-y-1 text-3xl leading-none text-acento md:text-4xl"
          >
            {/* El letrero dice cuándo y dónde, como un panel de salidas. */}
            <span>{confirmada ? fechaCorta(EVENTO.inicio) : t("coming_soon")}</span>
            <span>{EVENTO.ciudad}</span>
          </motion.p>

          <motion.h1
            initial={{ y: 24 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease }}
            className="mt-4 font-display text-[13vw] font-medium lowercase leading-[0.85] tracking-tighter text-surface-50 sm:text-[10vw] lg:text-[6.4vw] xl:text-[86px]"
          >
            {arriba}
            {abajo && (
              <>
                <br />
                {abajo}
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-base text-surface-300 md:text-lg"
          >
            {confirmada && <span>{hora(EVENTO.inicio, locale)}</span>}
            <span className="text-surface-100">{t("tagline_short")}</span>
            <span>{EVENTO.edicion.toLowerCase()} {EVENTO.anio}</span>
          </motion.p>

          {confirmada && (
            <motion.div
              initial={{ y: 18 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.7, delay: 0.32, ease }}
              className="mt-8"
            >
              <HeroCountdown />
            </motion.div>
          )}

          <motion.div
            initial={{ y: 18 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: 0.44, ease }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            {isPostEvent ? (
              <>
                {photosUrl && (
                  <HardButton href={photosUrl} external pulse>
                    {t("cta_photos")}
                  </HardButton>
                )}
                {recordingsUrl && (
                  <HardButton href={recordingsUrl} variant="outline" external>
                    {t("cta_recordings")}
                  </HardButton>
                )}
                {EVENTO.redes.instagram && (
                  <HardButton href={EVENTO.redes.instagram} variant="outline" external>
                    {t("cta_instagram")}
                  </HardButton>
                )}
                {notifyUrl && (
                  <HardButton href={notifyUrl} variant="outline" external>
                    {t("cta_notify")}
                  </HardButton>
                )}
              </>
            ) : isExpired ? (
              <>
                <HardButton href={localePath(locale, "/directorio")} pulse>
                  {t("cta_agenda")}
                </HardButton>
                {trackVirtualUrl && (
                  <HardButton href={trackVirtualUrl} variant="outline" external>
                    {t("cta_virtual")}
                  </HardButton>
                )}
              </>
            ) : (
              // Cada puerta se ofrece sólo si está abierta. El registro es la
              // excepción: cerrado se queda a la vista, apagado, para que quien
              // llega sepa que existió. Las etiquetas son cortas porque los tres
              // botones comparten una fila de ancho fijo.
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                {attendeeOpen ? (
                  <HardButton href={localePath(locale, "/registro")} pulse className="px-4">
                    {t("cta_register")}
                  </HardButton>
                ) : (
                  <HardButton
                    href={localePath(locale, "/registro")}
                    disabled
                    className="px-4"
                    sub={t("cta_register_closed_sub")}
                  >
                    {t("cta_register_closed")}
                  </HardButton>
                )}

                {showSpeakerCta && cfpOpen && (
                  <HardButton href={localePath(locale, "/speakers")} variant="outline" className="px-4">
                    {t("cta_speaker")}
                  </HardButton>
                )}

                {volunteerOpen && (
                  <HardButton href={localePath(locale, "/voluntarios")} variant="outline" className="px-4">
                    {t("cta_volunteer")}
                  </HardButton>
                )}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.15, ease }}
          className="order-1 lg:order-2"
        >
          <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[360px] lg:max-w-[560px]">
            <WireGlobe
              descripcion={t("globe_label")}
              marker={EVENTO.coordenadas}
              label={EVENTO.ciudad}
              className="relative aspect-square w-full"
            />
            <p className="etiqueta mt-1 text-center text-surface-300">
              {coordenadas(locale)} · {t("globe_hint")}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="relative z-20">
        <MarqueeStrip text={tCinta("date")} tone="block" duration={40} />
      </div>
    </section>
  );
}
