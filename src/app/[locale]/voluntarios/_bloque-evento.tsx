"use client";

import { AnimatePresence, motion } from "motion/react";
import { PhoneInput } from "@/components/forms/phone-input";
import { labelOf } from "@/data/attendee-form";
import { AVAILABILITY, DIETARY, INTEREST_AREAS, MOTIVATION_MAX, PREVIOUS_EXPERIENCE, SHIRT_SIZES, VOLUNTEER_TEXT_MAX } from "@/data/volunteer-form";
import { cn } from "@/lib/utils";
import type { Formulario } from "./_use-form";
import { Field, inputCls, Choice, Bloque } from "@/components/forms/campos";

export function BloqueEvento({ f }: { f: Formulario }) {
  const { locale, t, v, errors, set, toggleArea, needsDietaryOther } = f;
  return (
    <>
      {/* ── El día del evento ── */}
      <Bloque>{t.blockDay}</Bloque>

      <Field label={t.availability} required error={errors.availability}>
        <Choice
          options={AVAILABILITY}
          locale={locale}
          value={v.availability}
          onChange={(val) => set("availability", val)}
          cols={3}
        />
      </Field>

      <Field
        label={t.areas}
        required
        error={errors.interestAreas}
        hint={t.areas_hint}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {INTEREST_AREAS.map((a) => {
            const on = v.interestAreas.includes(a.value);
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => toggleArea(a.value)}
                aria-pressed={on}
                className={cn(
                  "flex items-center gap-3 border-2 px-4 py-3 text-left font-mono text-sm font-bold transition-all",
                  on
                    ? "border-tinta bg-tinta text-acento shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
                    : "border-tinta/75 bg-papel/80 text-tinta hover:-translate-y-px hover:border-tinta hover:shadow-[3px_3px_0_0_var(--color-tinta)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center border-2",
                    on ? "border-acento" : "border-tinta/75",
                  )}
                >
                  {on && (
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="var(--color-acento)" strokeWidth="5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
                {labelOf(a, locale)}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label={t.experience} required error={errors.previousExperience}>
        <Choice
          options={PREVIOUS_EXPERIENCE}
          locale={locale}
          value={v.previousExperience}
          onChange={(val) => set("previousExperience", val)}
          cols={3}
        />
      </Field>

      <Field
        label={t.motivation}
        htmlFor="v-motiv"
        hint={t.motivation_hint}
      >
        <textarea
          id="v-motiv"
          value={v.motivation}
          onChange={(e) => set("motivation", e.target.value)}
          placeholder={t.motivation_ph}
          maxLength={MOTIVATION_MAX}
          rows={4}
          className={cn(inputCls, "resize-y")}
        />
      </Field>

      {/* ── Logística ── */}
      <Bloque>{t.blockReady}</Bloque>

      <Field
        label={t.shirt}
        required
        error={errors.shirtSize}
        hint={t.shirt_hint}
      >
        <Choice
          options={SHIRT_SIZES}
          locale={locale}
          value={v.shirtSize}
          onChange={(val) => set("shirtSize", val)}
          cols={3}
        />
      </Field>

      <Field
        label={t.dietary}
        required
        error={errors.dietary}
        hint={t.dietary_hint}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {DIETARY.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => set("dietary", d.value)}
              aria-pressed={v.dietary === d.value}
              className={cn(
                "border-2 px-3 py-3 font-mono text-sm font-bold transition-all",
                v.dietary === d.value
                  ? "border-tinta bg-tinta text-acento shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
                  : "border-tinta/75 bg-papel/80 text-tinta hover:-translate-y-px hover:border-tinta hover:shadow-[3px_3px_0_0_var(--color-tinta)]",
              )}
            >
              {labelOf(d, locale)}
            </button>
          ))}
        </div>
      </Field>

      <AnimatePresence initial={false}>
        {needsDietaryOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Field label={t.which} required htmlFor="v-dieto" error={errors.dietaryOther}>
              <input
                id="v-dieto"
                name="dieta-otra"
                autoComplete="off"
                value={v.dietaryOther}
                onChange={(e) => set("dietaryOther", e.target.value)}
                placeholder={t.dietaryOther_ph}
                maxLength={VOLUNTEER_TEXT_MAX}
                aria-invalid={errors.dietaryOther ? true : undefined}
                className={cn(inputCls, errors.dietaryOther && "border-error")}
              />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <Field
        label={t.emergency}
        required
        htmlFor="v-emn"
        error={errors.emergencyName}
        hint={t.emergency_hint}
      >
        <input
          id="v-emn"
          name="contacto-emergencia"
          autoComplete="off"
          value={v.emergencyName}
          onChange={(e) => set("emergencyName", e.target.value)}
placeholder={t.emergency_ph}
          maxLength={80}
          aria-invalid={errors.emergencyName ? true : undefined}
          className={cn(inputCls, errors.emergencyName && "border-error")}
        />
      </Field>

      <PhoneInput
        label={t.emergencyPhone}
        autoComplete="off"
        required
        countryCode={v.emergencyCountry}
        onCountryChange={(code) => set("emergencyCountry", code)}
        value={v.emergencyPhone}
        onChange={(local) => set("emergencyPhone", local)}
        error={errors.emergencyPhone}
      />

    </>
  );
}
