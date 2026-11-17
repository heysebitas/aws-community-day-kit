"use client";

import { motion, AnimatePresence } from "motion/react";
import { PhoneInput } from "@/components/forms/phone-input";
import { cleanWhitespace, normalizeEmail } from "@/lib/normalize";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkedInIcon, XTwitterIcon, InstagramIcon, GithubIcon, BuilderCenterIcon, Field, TextInput, Textarea, PhotoUpload } from "./_components";
import type { Pantalla } from "./_use-screen";

export function PasoPerfil({ s }: { s: Pantalla }) {
  const { t, dialCode, setDialCode, emailHint, setEmailHint, form, set, setSocial, socialErrors, checkSocial, errors, clearErr } = s;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-mono text-lg font-bold text-surface-50">{t.step2}</h2>
        <p className="font-mono text-sm text-surface-400">{t.step2_desc}</p>
      </div>

      {/* Photo upload — full width, compact horizontal layout */}
      <Field label={t.photo} error={errors.photo}>
        <div className="flex items-center gap-4">
          <PhotoUpload
            value={form.photo}
            onChange={(v) => { set("photo", v); clearErr("photo"); }}
            className="aspect-square h-24 w-24 shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-1 text-surface-400">
            <p className="font-mono text-xs leading-relaxed">{t.photo_hint}</p>
            <p className="font-mono text-xs text-surface-300">JPG · PNG · WEBP · máx 8 MB</p>
          </div>
        </div>

        {/* Los consejos aparecen sólo mientras no hay foto: una
            vez subida ya no sirven de nada y estorban. */}
        <AnimatePresence>
          {!form.photo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-4 border-l-4 border-tinta bg-white/35 py-3 pl-4 pr-3">
                <p className="etiqueta m-0 mb-2 leading-none text-acento-profundo">
                  {t.photo_tips_title}
                </p>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {[t.photo_tip_1, t.photo_tip_2, t.photo_tip_3, t.photo_tip_4].map((tip, i) => (
                    <li key={i} className="flex gap-2 font-mono text-xs leading-relaxed text-tinta/75">
                      <span className="shrink-0 font-bold text-acento-profundo">·</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label={t.firstName} error={errors.firstName}>
          <TextInput enterKeyHint="next" value={form.firstName} onChange={(v) => { set("firstName", v); clearErr("firstName"); }} placeholder={t.firstName_ph} maxLength={80} name="firstName" autoComplete="given-name" />
        </Field>
        <Field label={t.lastName} error={errors.lastName}>
          <TextInput enterKeyHint="next" value={form.lastName} onChange={(v) => { set("lastName", v); clearErr("lastName"); }} placeholder={t.lastName_ph} maxLength={80} name="lastName" autoComplete="family-name" />
        </Field>
      </div>

      <Field label={t.tagline} error={errors.tagline}>
        <TextInput enterKeyHint="next" value={form.tagline} onChange={(v) => { set("tagline", v); clearErr("tagline"); }} placeholder={t.tagline_ph} maxLength={120} />
      </Field>

      <Field label={t.email} error={errors.email}>
        <TextInput
          enterKeyHint="next"
          value={form.email}
          onChange={(v) => {
            set("email", v);
            clearErr("email");
            setEmailHint(normalizeEmail(v).suggestion ?? "");
          }}
          onBlur={() => set("email", cleanWhitespace(form.email))}
          placeholder="tu@email.com"
          name="email"
          autoComplete="email"
          inputMode="email"
        />
        {emailHint && !errors.email && (
          <button type="button"
            onClick={() => { set("email", emailHint); setEmailHint(""); }}
            className="mt-1 font-mono text-xs text-acento underline underline-offset-2">
            ¿Quisiste decir {emailHint}?
          </button>
        )}
      </Field>

      <Field label={t.bio} error={errors.bio}>
        <Textarea value={form.bio} onChange={(v) => { set("bio", v); clearErr("bio"); }} placeholder={t.bio_ph} maxLength={700} rows={5} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.countryCity} error={errors.countryCity}>
          <TextInput enterKeyHint="next" value={form.countryCity} onChange={(v) => { set("countryCity", v); clearErr("countryCity"); }} placeholder={t.countryCity_ph} maxLength={80} />
        </Field>
        <Field label="" error={undefined}>
          <PhoneInput
            label={t.phone}
            required
            countryCode={dialCode}
            onCountryChange={setDialCode}
            value={form.phone}
            onChange={(local) => { set("phone", local); clearErr("phone"); }}
            error={errors.phone}
          />
        </Field>
      </div>

      <Field grupo label={t.firstTime} error={errors.firstTimeSpeaker}>
        <div className="flex gap-3">
          {([true, false] as const).map((val) => (
            <button key={String(val)} type="button" onClick={() => { set("firstTimeSpeaker", val); clearErr("firstTimeSpeaker"); }}
              aria-pressed={form.firstTimeSpeaker === val}
              className={cn(
                "flex-1 border-2 py-3 font-mono text-sm font-bold transition-all",
                form.firstTimeSpeaker === val
                  ? "border-tinta bg-tinta text-acento shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
                  : "border-tinta/75 bg-papel/80 text-tinta hover:-translate-y-px hover:border-tinta hover:shadow-[3px_3px_0_0_var(--color-tinta)]",
              )}
            >
              {val ? t.yes_opt : t.no_opt}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs font-semibold text-surface-100">{t.socials}</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            ["builderCenter", <BuilderCenterIcon key="bc" className="h-3.5 w-3.5" />, "AWS Builder Center"],
            ["linkedin",  <LinkedInIcon  key="li" className="h-3.5 w-3.5" />, "LinkedIn"],
            ["github",    <GithubIcon    key="gh" className="h-3.5 w-3.5" />, "GitHub"],
            ["twitter",   <XTwitterIcon  key="tw" className="h-3.5 w-3.5" />, "X / Twitter"],
            ["instagram", <InstagramIcon key="ig" className="h-3.5 w-3.5" />, "Instagram"],
            ["blog",      <Globe         key="bl" className="h-3.5 w-3.5" />, "Blog / Web"],
          ] as const).map(([key, icon, label]) => (
            // El icono va dentro del campo, en posición absoluta: `.form-block` ya le pinta su borde y su fondo al input.
            <div key={key} className="relative">
              {/* z-10: al enfocar, `.form-block` le aplica al
                  campo un `transform`, que crea un contexto de
                  apilamiento y lo pinta por encima del icono.
                  Sin esto el logo desaparecia al hacer clic. */}
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-tinta/70">
                {icon}
              </span>
              <input
                value={form.social[key as keyof typeof form.social]}
                onChange={(e) => setSocial(key, e.target.value)}
                onBlur={() => checkSocial(key)}
                placeholder={label}
                inputMode="url"
                aria-label={label}
                className={cn(
                  "w-full py-2.5 pl-10 pr-3 font-mono text-xs",
                  socialErrors[key] && "border-error",
                )}
              />
              {socialErrors[key] && (
                <p className="m-0 mt-1 font-mono text-xs text-error">
                  {socialErrors[key]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
