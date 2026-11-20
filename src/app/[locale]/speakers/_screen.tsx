"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { CallForSpeakers } from "@/components/sections/call-for-speakers";
import { SuccessScreen } from "@/components/forms/success-screen";
import { DotHeading } from "@/components/ui/dot-heading";
import { localePath } from "@/lib/utils";
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Lang, type TextosPorIdioma } from "./_shared";
import { useSpeakersScreen } from "./_use-screen";
import { PasoCharla } from "./_paso-charla";
import { PasoPerfil } from "./_paso-perfil";
import { PasoFinal } from "./_paso-final";
import { ConvocatoriaCerrada } from "./_cerrada";

export function SpeakersScreen({ formOnly = false, pasoInicial = 0, textos }: { formOnly?: boolean; pasoInicial?: number; textos: TextosPorIdioma }) {
  const s = useSpeakersScreen(pasoInicial, textos);
  const { locale, lang, setLang, t, step, dir, cfsOpen, form, formRef, captchaToken, hasCaptcha, goNext, goBack, submitting, submitted, summaryRows, handleSubmit, variants } = s;
  // ── Estado del Call for Speakers (controlado desde el admin) ────────────────
  if (cfsOpen === null) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-surface-900">
        <Loader2 className="h-8 w-8 animate-spin text-acento" />
      </main>
    );
  }
  if (cfsOpen === false) return <ConvocatoriaCerrada />;

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SuccessScreen
        kind="speaker"
        name={`${form.firstName} ${form.lastName}`}
        rows={summaryRows}
        extra={
          <p className="mx-auto max-w-[52ch] font-mono text-sm leading-relaxed text-tinta/70">
            {t.success_desc}
          </p>
        }
      />
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    // pt-8 sólo en móvil: separa el titular del navbar fijo. Sin pb-24: el bloque
    // del formulario llega hasta el final de la página.
    <div
      className={cn(
        "min-h-svh bg-surface-900",
        // El navbar es fijo y mide 80px. En /speakers arriba va la seccion de
        // bases, cuyo relleno movil es de esos mismos 80px: quedaba separacion
        // cero y el titular se pegaba a la barra, asi que se suman 32px. En
        // /postular el bloque del formulario ya trae su propio pt-28, y
        // sumarle esto lo dejaria demasiado abajo.
        !formOnly && "pt-8 md:pt-0",
      )}
    >
      {/* Toda la información del Call for Speakers vive aquí, no en el home:
          quien va como asistente no necesita leer las bases. En
          /speakers/postular se omite: quien llega ahí ya decidió postular. */}
      {!formOnly && <CallForSpeakers />}

      {/* La hoja del formulario corre sobre el bloque del tema con tinta negra, igual que /registro y /voluntarios. */}
      {/* El formulario vive SOLO en /speakers/postular. En /speakers quedan
          las bases y el boton: tener el formulario debajo hacia que el boton
          llevara a un ancla de la misma pagina, que es justo lo que se quiso
          dejar atras. */}
      {formOnly && (
      <div id="postular" className="form-block bg-acento px-4 pb-16 pt-28">
        {/* Encabezado propio cuando el formulario va solo: sin las bases
            arriba, la persona necesita ver que esta postulando y poder
            volver a leerlas sin perder lo que ya escribio. */}
        {formOnly && (
          <div className="mx-auto mb-10 w-full max-w-3xl">
            <DotHeading as="h1" tone="block" variant="inverted">
              {t.step_apply}
            </DotHeading>
            <p className="mt-4 font-mono text-sm leading-relaxed text-tinta/70">
              {t.apply_lead}
            </p>
            <Link
              href={localePath(locale, "/speakers")}
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-tinta underline underline-offset-4"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t.apply_back}
            </Link>
          </div>
        )}
        {/* Una sola columna: la vista previa aparece al final, para no competir con el formulario. */}
        <div className="mx-auto w-full max-w-3xl">
        <div className="min-w-0">

        {/* Selector de idioma del formulario */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex items-center border-2 border-tinta">
            {(["es", "en"] as Lang[]).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)}
                className={cn(
                  "px-5 py-2 font-mono text-xs font-bold transition-colors",
                  lang === l
                    ? "bg-tinta text-acento"
                    : "text-tinta/70 hover:bg-tinta/10 hover:text-tinta",
                )}
              >
                {l === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* Pasos. El conector va detrás de los números, en una sola capa; la parte
            recorrida se pinta con un ancho porcentual. */}
        <div className="relative mb-10">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-tinta/20" aria-hidden="true">
            <div
              className="h-full bg-tinta transition-[width] duration-500"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>

          <ol className="relative flex items-start justify-between gap-2">
            {[t.step1, t.step2, t.step3].map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center border-2 font-mono text-xs font-bold transition-all",
                      done || current
                        ? "border-tinta bg-tinta text-acento"
                        : "border-tinta/30 bg-acento text-tinta/70",
                      current && "shadow-[3px_3px_0_0_rgba(0,0,0,0.35)]",
                    )}
                    aria-current={current ? "step" : undefined}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "hidden text-center font-mono text-xs leading-tight sm:block",
                      current ? "font-bold text-tinta" : "text-tinta/70",
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Card */}
        <div className="overflow-hidden border-2 border-tinta bg-acento/40 shadow-[8px_8px_0_0_rgba(10,10,15,0.28)]">
          <form ref={formRef} onSubmit={handleSubmit}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="p-6 sm:p-8"
              >
                {/* ── Step 0: Session ── */}
                {step === 0 && <PasoCharla s={s} />}
                {step === 1 && <PasoPerfil s={s} />}
                {step === 2 && <PasoFinal s={s} />}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className={cn("flex items-center gap-3 border-t border-tinta/20 px-6 py-4 sm:px-8", step === 0 ? "justify-end" : "justify-between")}>
              {step > 0 && (
                <button type="button" onClick={goBack} className="flex items-center gap-2 border border-tinta/20 px-5 py-2.5 font-mono text-sm font-bold text-surface-300 hover:border-tinta/40 hover:text-surface-100 transition-all">
                  <ChevronLeft className="h-4 w-4" /> {t.back}
                </button>
              )}
              {step < 2 ? (
                <button type="button" onClick={goNext} className="flex items-center gap-2 bg-tinta px-6 py-2.5 font-mono text-sm font-bold text-acento hover:bg-tinta transition-all">
                  {t.next} <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={submitting || (hasCaptcha && !captchaToken)} className="flex items-center gap-2 bg-tinta px-6 py-2.5 font-mono text-sm font-bold text-acento hover:bg-tinta disabled:opacity-60 transition-all">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t.submitting}</> : t.submit}
                </button>
              )}
            </div>
          </form>

          </div>{/* card */}
        </div>{/* columna */}
        </div>{/* ancho */}
      </div>
      )}
    </div>
  );
}
