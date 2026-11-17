"use client";

import Link from "next/link";
import { Turnstile } from "@/components/ui/turnstile";
import { cleanWhitespace } from "@/lib/normalize";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { emptyCoSpeaker } from "./_shared";
import { LinkedInIcon, XTwitterIcon, InstagramIcon, PhotoUpload } from "./_components";
import { DOMINIO } from "@/config";
import type { Pantalla } from "./_use-screen";

export function PasoFinal({ s }: { s: Pantalla }) {
  const { tf, t, form, setForm, set, checkCoSpeakerSocial, updateCoSpeaker, updateCoSpeakerSocial, captchaRef, captchaToken, setCaptchaToken, captchaMounted, siteKey, hasCaptcha, computedSlug, errors, clearErr, previewCard } = s;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-mono text-lg font-bold text-surface-50">{t.step3}</h2>
        <p className="font-mono text-sm text-surface-400">{t.step3_desc}</p>
      </div>

      {/* Slug preview */}
      <div className="border-l-4 border-tinta bg-white/40 py-3 pl-4 pr-3">
        <p className="etiqueta m-0 mb-1.5 leading-none text-acento-profundo">{t.slug_preview}</p>
        <p className="m-0 break-all font-mono text-sm text-tinta">
          {DOMINIO}/speakers/<span className="font-bold">{computedSlug || "..."}</span>
        </p>
      </div>

      {/* Co-speakers */}
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs font-semibold text-surface-100">{t.coSpeakers}</span>
        {form.coSpeakers.map((cs, i) => (
          <div key={i} className="border-2 border-tinta bg-white/35 p-4 shadow-[5px_5px_0_0_rgba(0,0,0,0.22)]">
            <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-tinta/20 pb-3">
              <span className="flex items-center gap-2.5">
                {/* Numero en caja negra, como en las secciones
                    legales: con tres co-speakers posibles hay que
                    saber cual se esta llenando. */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-tinta bg-tinta font-mono text-xs font-bold tabular-nums text-acento">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs font-bold text-tinta">{t.coSpeaker_label}</span>
              </span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, coSpeakers: f.coSpeakers.filter((_, j) => j !== i) }))}
                className="shrink-0 border-2 border-error px-2.5 py-1 font-mono text-xs font-bold text-error transition-colors hover:bg-error hover:text-acento"
              >
                {t.coSpeaker_remove}
              </button>
            </div>

            {/* Photo */}
            <div className="mb-3">
              <span className="mb-1.5 block font-mono text-xs font-semibold text-surface-100">{t.coSpeaker_photo}</span>
              <div className="flex items-center gap-3">
                <PhotoUpload value={cs.photo} onChange={(v) => { updateCoSpeaker(i, { photo: v }); clearErr(`cs_${i}_photo`); }} className="aspect-square h-16 w-16 shrink-0" />
                <p className="font-mono text-xs text-surface-400 leading-relaxed">{t.photo_hint}</p>
              </div>
              {errors[`cs_${i}_photo`] && <p className="mt-1 font-mono text-xs text-error">{errors[`cs_${i}_photo`]}</p>}
            </div>

            {/* Name row */}
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <input aria-invalid={errors[`cs_${i}_firstName`] ? true : undefined} value={cs.firstName} onChange={(e) => { updateCoSpeaker(i, { firstName: e.target.value }); clearErr(`cs_${i}_firstName`); }}
                  placeholder={t.coSpeaker_firstName_ph} maxLength={80}
                  className="w-full px-3 py-2.5 font-mono text-sm" />
                {errors[`cs_${i}_firstName`] && <p className="font-mono text-xs text-error">{errors[`cs_${i}_firstName`]}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <input aria-invalid={errors[`cs_${i}_lastName`] ? true : undefined} value={cs.lastName} onChange={(e) => { updateCoSpeaker(i, { lastName: e.target.value }); clearErr(`cs_${i}_lastName`); }}
                  placeholder={t.coSpeaker_lastName_ph} maxLength={80}
                  className="w-full px-3 py-2.5 font-mono text-sm" />
                {errors[`cs_${i}_lastName`] && <p className="font-mono text-xs text-error">{errors[`cs_${i}_lastName`]}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="mb-3 flex flex-col gap-1">
              <input value={cs.email}
                aria-invalid={errors[`cs_${i}_email`] ? true : undefined}
                onChange={(e) => { updateCoSpeaker(i, { email: e.target.value }); clearErr(`cs_${i}_email`); }}
                onBlur={(e) => updateCoSpeaker(i, { email: cleanWhitespace(e.target.value).toLowerCase() })}
                placeholder={t.coSpeaker_email_ph}
                /* type="text" a propósito: el validador nativo acepta "a@b"
                   y muestra su propio globo; el nuestro es más estricto. */
                type="text" inputMode="email" autoComplete="off" spellCheck={false}
                maxLength={200}
                className="w-full px-3 py-2.5 font-mono text-sm" />
              {errors[`cs_${i}_email`] && <p className="font-mono text-xs text-error">{errors[`cs_${i}_email`]}</p>}
            </div>

            {/* Bio */}
            <div className="mb-3 relative">
              <textarea value={cs.bio} onChange={(e) => updateCoSpeaker(i, { bio: e.target.value })}
                placeholder={t.coSpeaker_bio_ph} maxLength={400} rows={3}
                className="w-full resize-none px-3 py-2.5 font-mono text-sm" />
              <span className={cn("absolute right-3 bottom-3 font-mono text-xs", cs.bio.length > 360 ? "text-acento" : "text-surface-300")}>
                {cs.bio.length}/400
              </span>
            </div>

            {/* Social */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs font-semibold text-tinta/85">{t.coSpeaker_socials}</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  ["linkedin",  <LinkedInIcon  key="li" className="h-3.5 w-3.5" />, "LinkedIn"],
                  ["twitter",   <XTwitterIcon  key="tw" className="h-3.5 w-3.5" />, "X / Twitter"],
                  ["instagram", <InstagramIcon key="ig" className="h-3.5 w-3.5" />, "Instagram"],
                ] as const).map(([key, icon, label]) => (
                  // Mismo tratamiento que las redes del speaker:
                  // el icono va dentro del campo, con z-10 para
                  // que el `transform` del foco no lo tape.
                  <div key={key} className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-tinta/70">
                      {icon}
                    </span>
                    <input
                      value={cs.social[key]}
                      onChange={(e) => updateCoSpeakerSocial(i, key, e.target.value)}
                      onBlur={() => checkCoSpeakerSocial(i, key)}
                      placeholder={label}
                      inputMode="url"
                      aria-invalid={errors[`cs_${i}_${key}`] ? true : undefined}
                      aria-label={`${label} — ${t.coSpeaker_label} ${i + 1}`}
                      className={cn(
                        "w-full py-2 pl-8 pr-2.5 font-mono text-xs",
                        errors[`cs_${i}_${key}`] && "border-error",
                      )}
                    />
                    {errors[`cs_${i}_${key}`] && (
                      <p className="m-0 mt-1 font-mono text-xs text-error">
                        {errors[`cs_${i}_${key}`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        {form.coSpeakers.length < 3 && (
          <button type="button" onClick={() => setForm((f) => ({ ...f, coSpeakers: [...f.coSpeakers, emptyCoSpeaker()] }))}
            className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-tinta/40 py-3.5 font-mono text-xs font-bold text-tinta/70 transition-all hover:border-tinta hover:bg-tinta hover:text-acento">
            {t.coSpeaker_add}
          </button>
        )}
      </div>

      {/* Legal agreements */}
      <div className="flex flex-col gap-2">
        {/* Code of conduct */}
        <label className={cn("flex cursor-pointer items-start gap-3 border-2 p-3.5 transition-all", form.codeOfConduct ? "border-tinta bg-tinta/5" : "border-tinta/75 bg-papel/80 hover:border-tinta")}>
          <div className="relative mt-0.5 shrink-0">
            <input type="checkbox" aria-invalid={errors.codeOfConduct ? true : undefined} checked={form.codeOfConduct} onChange={(e) => { set("codeOfConduct", e.target.checked); clearErr("codeOfConduct"); }} className="peer sr-only" />
            <div className={cn("flex h-5 w-5 items-center justify-center border-2 transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tinta", form.codeOfConduct ? "border-tinta bg-tinta" : "border-tinta/75 bg-papel")}>
              {form.codeOfConduct && <CheckCircle2 className="h-3 w-3 text-acento" />}
            </div>
          </div>
          <span className="font-mono text-xs text-surface-200 leading-relaxed">
            {t.consent_conduct}{" "}
            <Link href="/codigo-conducta" target="_blank" className="text-acento hover:underline">{t.conduct_link}</Link>
          </span>
        </label>
        {errors.codeOfConduct && <p className="font-mono text-xs text-error px-1">{errors.codeOfConduct}</p>}

        {/* Privacy */}
        <label className={cn("flex cursor-pointer items-start gap-3 border-2 p-3.5 transition-all", form.consent ? "border-tinta bg-tinta/5" : "border-tinta/75 bg-papel/80 hover:border-tinta")}>
          <div className="relative mt-0.5 shrink-0">
            <input type="checkbox" aria-invalid={errors.consent ? true : undefined} checked={form.consent} onChange={(e) => { set("consent", e.target.checked); clearErr("consent"); }} className="peer sr-only" />
            <div className={cn("flex h-5 w-5 items-center justify-center border-2 transition-all peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tinta", form.consent ? "border-tinta bg-tinta" : "border-tinta/75 bg-papel")}>
              {form.consent && <CheckCircle2 className="h-3 w-3 text-acento" />}
            </div>
          </div>
          <span className="font-mono text-xs text-surface-200 leading-relaxed">
            {t.consent_privacy}{" "}
            <Link href="/privacidad" target="_blank" className="text-acento hover:underline">{t.privacy}</Link>
          </span>
        </label>
        {errors.consent && <p className="font-mono text-xs text-error px-1">{errors.consent}</p>}
      </div>

      {/* Turnstile */}
      {/* Invisible salvo que Cloudflare desconfíe. */}
      {hasCaptcha && (
        <div className="flex items-center justify-center">
          {captchaMounted ? (
            <Turnstile
              ref={captchaRef}
              siteKey={siteKey!}
              theme="light"
              appearance="interaction-only"
              onVerify={(token) => { setCaptchaToken(token); clearErr("submit"); }}
              onExpire={() => { setCaptchaToken(null); captchaRef.current?.reset(); }}
              onError={() => { setCaptchaToken(null); captchaRef.current?.reset(); }}
            />
          ) : null}
        </div>
      )}

      {hasCaptcha && !captchaToken && !errors.submit && (
        <p className="m-0 text-center font-mono text-xs text-tinta/70">
          {tf("captcha_checking")}
        </p>
      )}

      {errors.submit && <p className="border-2 border-error bg-error/10 px-4 py-3 font-mono text-sm text-error">{errors.submit}</p>}

      {/* La vista previa va al final: es lo último que se ve antes de enviar. */}
      <div className="mt-2 border-t-2 border-dashed border-tinta/25 pt-6">
        <p className="dot-matrix mb-4 text-lg leading-none text-tinta">
          así se verá tu tarjeta en el directorio
        </p>
        <div className="mx-auto w-full max-w-[360px]">{previewCard}</div>
      </div>
    </div>
  );
}
