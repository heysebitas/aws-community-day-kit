"use client";

import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, TextInput, Textarea, CardSelector } from "./_components";
import type { Pantalla } from "./_use-screen";

export function PasoCharla({ s }: { s: Pantalla }) {
  const { t, form, set, errors, clearErr, sessionTypeOpts, trackOpts, audienceLevelOpts } = s;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-mono text-lg font-bold text-surface-50">{t.step1}</h2>
        <p className="font-mono text-sm text-surface-400">{t.step1_desc}</p>
      </div>

      <Field label={t.talkTitle} error={errors.talkTitle}>
        <TextInput enterKeyHint="next" value={form.talkTitle} onChange={(v) => { set("talkTitle", v); clearErr("talkTitle"); }} placeholder={t.talkTitle_ph} maxLength={80} />
      </Field>

      <Field label={t.description} error={errors.talkAbstract}>
        <Textarea value={form.talkAbstract} onChange={(v) => { set("talkAbstract", v); clearErr("talkAbstract"); }} placeholder={t.description_ph} maxLength={1000} rows={5} />
      </Field>

      <Field grupo label={t.sessionType} error={errors.sessionType}>
        <CardSelector
          options={sessionTypeOpts}
          value={form.sessionType as never}
          onChange={(v) => { set("sessionType", v); clearErr("sessionType"); if (v !== "online") { set("preRecordingDate", ""); clearErr("preRecordingDate"); } }}
        />
      </Field>

      {form.sessionType === "online" && (
        <Field label={t.preRecordingDate} error={errors.preRecordingDate}>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-surface-300" />
            <TextInput
              enterKeyHint="next"
              value={form.preRecordingDate}
              onChange={(v) => { set("preRecordingDate", v); clearErr("preRecordingDate"); }}
              placeholder={t.preRecordingDate_ph}
              maxLength={100}
              className="pl-10"
            />
          </div>
        </Field>
      )}

      <Field grupo label={t.track} error={errors.track}>
        <CardSelector
          options={trackOpts}
          value={form.track as never}
          onChange={(v) => { set("track", v); clearErr("track"); }}
        />
        <p className="mt-2 font-mono text-xs leading-relaxed text-surface-400">
          {t.track_hint}
        </p>
      </Field>

      <Field grupo label={t.audienceLevel} error={errors.audienceLevel}>
        <CardSelector
          options={audienceLevelOpts}
          value={form.audienceLevel as never}
          onChange={(v) => { set("audienceLevel", v); clearErr("audienceLevel"); }}
        />
      </Field>

      <Field grupo label={t.lang_label}>
        <div className="flex gap-3">
          {([["es", t.lang_es], ["en", t.lang_en]] as const).map(([val, lbl]) => (
            <button key={val} type="button" onClick={() => set("language", val)}
              // Mismo tratamiento que CardSelector: elegido en tinta sólida.
              aria-pressed={form.language === val}
              className={cn(
                "flex-1 border-2 py-3 font-mono text-xs font-bold transition-all",
                form.language === val
                  ? "border-tinta bg-tinta text-acento shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
                  : "border-tinta/75 bg-papel/80 text-tinta hover:-translate-y-px hover:border-tinta hover:shadow-[3px_3px_0_0_var(--color-tinta)]",
              )}
            >{lbl}</button>
          ))}
        </div>
      </Field>

      <Field label={t.requirements}>
        <Textarea value={form.requirements} onChange={(v) => set("requirements", v)} placeholder={t.requirements_ph} maxLength={300} rows={2} />
      </Field>
    </div>
  );
}
