"use client";

import Link from "next/link";
import { Turnstile } from "@/components/ui/turnstile";
import { ObfuscatedEmail } from "@/components/ui/obfuscated-email";
import { cn } from "@/lib/utils";
import type { Formulario } from "./_use-form";
import { siteKey } from "./_use-form";

export function BloqueCierre({ f }: { f: Formulario }) {
  const { t, acceptCoc, setAcceptCoc, acceptPrivacy, setAcceptPrivacy, errors, setErrors, submitting, formError, captchaToken, setCaptchaToken, captchaRef, captchaMounted } = f;
  return (
    <>
      {/* ── Consentimientos ── */}
      <div className="flex flex-col gap-3 border-t-2 border-tinta/20 pt-6">
        {(
          [
            ["coc", acceptCoc, setAcceptCoc, t.coc_text, t.coc_link, "/codigo-conducta"],
            ["privacy", acceptPrivacy, setAcceptPrivacy, t.privacy_text, t.privacy_link, "/privacidad"],
          ] as const
        ).map(([key, checked, setter, text, linkText, href]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="flex cursor-pointer items-start gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => {
                  setter(!checked);
                  if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
                }}
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-all",
                  checked ? "border-tinta bg-tinta" : "border-tinta/75 bg-papel/80",
                  errors[key] && "border-error",
                )}
              >
                {checked && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="var(--color-acento)" strokeWidth="4">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
              <span className="font-mono text-xs leading-relaxed text-tinta/85">
                {text}
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline underline-offset-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {linkText}
                </a>
                . <span className="text-acento-profundo">*</span>
              </span>
            </label>
            {errors[key] && (
              <p className="m-0 pl-8 font-mono text-xs text-error">{errors[key]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Quién se equivocó de formulario: quien sólo quiere asistir, y quien ya se
          registró y ahora quiere sumarse al equipo. No se puede estar en las dos
          listas, así que al segundo se le dice a quién escribir. */}
      <div className="flex flex-col gap-2 border-2 border-tinta/30 bg-white/30 px-4 py-3.5">
        <p className="m-0 font-mono text-xs leading-relaxed text-tinta/80">
          {t.notice1a}
          <strong className="font-bold">{t.notice1b}</strong>
          {t.notice1c}
          <Link href="/registro" className="font-bold underline underline-offset-4">
            {t.notice1link}
          </Link>
          .
        </p>
        <p className="m-0 font-mono text-xs leading-relaxed text-tinta/80">
          {t.notice2a}
          <ObfuscatedEmail
            box="general"
            subject="Quiero pasar de asistente a voluntario"
            className="font-bold underline underline-offset-4"
          />
          {t.notice2b}
        </p>
      </div>

      {siteKey && (
        <div className="flex items-center justify-center">
          {captchaMounted ? (
            <Turnstile
              ref={captchaRef}
              siteKey={siteKey}
              theme="light"
              appearance="interaction-only"
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
            />
          ) : null}
        </div>
      )}

      {formError && (
        <p role="alert" className="m-0 border-2 border-error bg-error/10 px-4 py-3 font-mono text-sm text-error">
          {formError}
        </p>
      )}

      {siteKey && !captchaToken && !formError && (
        <p className="m-0 text-center font-mono text-xs text-tinta/70">
          {t.captcha}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || (!!siteKey && !captchaToken)}
        className="btn-hard w-full px-6 py-4 font-mono text-sm"
      >
        {submitting ? t.sending : t.submit}
      </button>
    </>
  );
}
