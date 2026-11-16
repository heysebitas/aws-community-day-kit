"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TRACKS } from "@/data/session-tracks";
import { motion, AnimatePresence } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Turnstile, type TurnstileHandle } from "@/components/ui/turnstile";
import { CallForSpeakers } from "@/components/sections/call-for-speakers";
import { PhoneInput } from "@/components/forms/phone-input";
import { SpeakerPreview } from "@/components/forms/previews";
import { SuccessScreen, type SummaryRow } from "@/components/forms/success-screen";
import { useCountdown } from "@/hooks/use-countdown";
import { DotHeading } from "@/components/ui/dot-heading";
import { localePath } from "@/lib/utils";
import {
  cleanWhitespace, findCountry, normalizeEmail, normalizePhone, DEFAULT_COUNTRY,
} from "@/lib/normalize";
import {
  Wifi,
  MapPin,
  GraduationCap,
  BookOpen,
  Layers,
  Cpu,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Globe,
  Calendar,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeLink } from "@/lib/normalize";
import {
  toSlug, emptyCoSpeaker, T, type Lang, type CoSpeaker,
} from "./_shared";
import {
  LinkedInIcon, XTwitterIcon, InstagramIcon, GithubIcon, BuilderCenterIcon,
  Field, TextInput, Textarea, PhotoUpload, CardSelector,
} from "./_components";
import { EVENTO, DOMINIO, IDIOMA_BASE } from "@/config";
import { fechaCorta, fechaLarga } from "@/config/fechas";

// ── Main component ────────────────────────────────────────────────────────────
/** Pantalla del Call for Speakers. */
export function SpeakersScreen({ formOnly = false }: { formOnly?: boolean }) {
  const tf = useTranslations("Forms");
  const locale = useLocale();
  const [lang, setLang] = useState<Lang>("es");
  const t = T[lang];
  const [step, setStep] = useState(0);
  // Indicativo del teléfono; el número se guarda sin él y se une al enviar.
  const [dialCode, setDialCode] = useState(DEFAULT_COUNTRY.code);
  const [emailHint, setEmailHint] = useState("");
  // Paso de confirmación en pantallas donde la preview no cabe al lado.
  const [dir, setDir] = useState(1); // 1=forward, -1=back

  // Estado del Call for Speakers: lo manda el plazo de EVENTO.cfpCierre y nada mas.
  // Este formulario es estatico (las preguntas estan escritas mas abajo, no
  // salen de un builder), asi que no hay nada que abrir ni cerrar a mano.
  const { isExpired, isActive } = useCountdown(EVENTO.cfpCierre);
  // Se calcula directo, sin esperar a hidratar: así el servidor ya devuelve la
  // página completa, para quien comparte el enlace y para los buscadores.
  const cfsOpen = isActive
    ? !isExpired
    : Date.now() <= new Date(EVENTO.cfpCierre).getTime();

  // Form data
  const [form, setForm] = useState({
    // Con online apagado sólo queda presencial: va elegido de entrada para no
    // pedir un clic en la única tarjeta que se puede tocar.
    talkTitle: "", talkAbstract: "", sessionType: (EVENTO.cfp.online ? "" : "in-person") as string,
    preRecordingDate: "",
    audienceLevel: "" as string, track: "" as string, language: "es", requirements: "",
    firstName: "", lastName: "", tagline: "", email: "", bio: "", photo: "",
    countryCity: "", phone: "", firstTimeSpeaker: null as boolean | null,
    social: { builderCenter: "", linkedin: "", twitter: "", instagram: "", github: "", blog: "" },
    coSpeakers: [] as CoSpeaker[], consent: false, codeOfConduct: false,
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const setSocial = (k: string, v: string) => setForm((f) => ({ ...f, social: { ...f.social, [k]: v } }));

  // Errores de las casillas de redes, por clave. Se comprueban al salir del
  // campo: avisar mientras se escribe una URL es ruido, porque hasta el ultimo
  // caracter esta incompleta.
  const [socialErrors, setSocialErrors] = useState<Record<string, string>>({});

  /** Valida una red del co-speaker al salir del campo. */
  const checkCoSpeakerSocial = (i: number, key: "linkedin" | "twitter" | "instagram") => {
    const raw = form.coSpeakers[i]?.social[key] ?? "";
    const r = normalizeLink(raw, key);
    const k = `cs_${i}_${key}`;
    if (r.ok) {
      clearErr(k);
      if (r.value !== raw) updateCoSpeakerSocial(i, key, r.value);
    } else {
      err(k, r.reason);
    }
  };

  const checkSocial = (key: string) => {
    const raw = form.social[key as keyof typeof form.social] ?? "";
    const r = normalizeLink(raw, key);
    setSocialErrors((prev) => {
      const next = { ...prev };
      if (r.ok) {
        delete next[key];
        // Se guarda ya normalizado (https, sin barra final, sin arroba): asi
        // lo que se envia es lo mismo que se valido.
        if (r.value !== raw) setSocial(key, r.value);
      } else {
        next[key] = r.reason;
      }
      return next;
    });
  };
  const updateCoSpeaker = (i: number, patch: Partial<CoSpeaker>) =>
    setForm((f) => {
      const arr = [...f.coSpeakers];
      arr[i] = { ...arr[i], ...patch };
      return { ...f, coSpeakers: arr };
    });
  const updateCoSpeakerSocial = (i: number, k: keyof CoSpeaker["social"], v: string) =>
    setForm((f) => {
      const arr = [...f.coSpeakers];
      arr[i] = { ...arr[i], social: { ...arr[i].social, [k]: v } };
      return { ...f, coSpeakers: arr };
    });

  // hCaptcha
  const captchaRef = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaMounted, setCaptchaMounted] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const hasCaptcha = !!(siteKey && siteKey !== "xxx");
  useEffect(() => { if (hasCaptcha) setCaptchaMounted(true); }, [hasCaptcha]);

  // Compute slug from all speakers' names
  const computedSlug = useMemo(() => {
    const mainSlug = toSlug(`${form.firstName} ${form.lastName}`);
    if (!mainSlug) return "";
    const coSlugs = form.coSpeakers
      .filter((cs) => cs.firstName || cs.lastName)
      .map((cs) => toSlug(`${cs.firstName} ${cs.lastName}`))
      .filter(Boolean);
    const all = [mainSlug, ...coSlugs];
    if (all.length === 1) return all[0];
    const last = all[all.length - 1];
    return all.slice(0, -1).join("-") + "-y-" + last;
  }, [form.firstName, form.lastName, form.coSpeakers]);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const err = (k: string, msg: string) => setErrors((e) => ({ ...e, [k]: msg }));
  const clearErr = (k: string) => setErrors((e) => { const n = { ...e }; delete n[k]; return n; });

  const validate = (s: number): boolean => {
    const errs: Record<string, string> = {};

    // Las redes se revisan en cualquier paso donde haya alguna escrita: son
    // opcionales, pero si hay algo puesto tiene que ser un enlace utilizable.
    // Sin esto se podia avanzar con un error visible en pantalla.
    const socialProblems: Record<string, string> = {};
    for (const [k, v] of Object.entries(form.social)) {
      if (!v) continue;
      const r = normalizeLink(v, k);
      if (!r.ok) socialProblems[k] = r.reason;
    }

    // Las de los co-speakers van al mismo saco de errores del paso.
    form.coSpeakers.forEach((cs, i) => {
      (["linkedin", "twitter", "instagram"] as const).forEach((k) => {
        const v = cs.social[k];
        if (!v) return;
        const r = normalizeLink(v, k);
        if (!r.ok) errs[`cs_${i}_${k}`] = r.reason;
      });
    });
    if (Object.keys(socialProblems).length > 0) {
      setSocialErrors(socialProblems);
      if (s === 1) return false;
    }
    if (s === 0) {
      if (!form.talkTitle.trim())    errs.talkTitle    = t.req;
      if (!form.talkAbstract.trim()) errs.talkAbstract = t.req;
      if (!form.sessionType)         errs.sessionType  = t.req;
      if (form.sessionType === "online" && !form.preRecordingDate.trim()) errs.preRecordingDate = t.req;
      if (!form.audienceLevel)       errs.audienceLevel = t.req;
      if (!form.track)               errs.track = t.req;
    }
    if (s === 1) {
      if (!form.firstName.trim())     errs.firstName = t.req;
      if (!form.lastName.trim())      errs.lastName  = t.req;
      if (!form.tagline.trim())       errs.tagline   = t.req;
      if (!cleanWhitespace(form.email)) errs.email = t.req;
      else {
        const check = normalizeEmail(form.email);
        if (!check.ok) errs.email = check.reason;
      }
      if (!form.bio.trim())           errs.bio       = t.req;
      if (!form.photo)                errs.photo     = t.req;
      if (!form.countryCity.trim())   errs.countryCity = t.req;
      if (!form.phone.trim()) errs.phone = t.req;
      else {
        const check = normalizePhone(form.phone, findCountry(dialCode));
        if (!check.ok) errs.phone = check.reason;
      }
      if (form.firstTimeSpeaker === null) errs.firstTimeSpeaker = t.req;
    }
    if (s === 2) {
      if (!form.codeOfConduct) errs.codeOfConduct = t.req;
      if (!form.consent)       errs.consent       = t.req;
      form.coSpeakers.forEach((cs, i) => {
        if (!cs.firstName.trim()) errs[`cs_${i}_firstName`] = t.req;
        if (!cs.lastName.trim())  errs[`cs_${i}_lastName`]  = t.req;
        if (!cleanWhitespace(cs.email)) errs[`cs_${i}_email`] = t.req;
        else {
          const check = normalizeEmail(cs.email);
          if (!check.ok) errs[`cs_${i}_email`] = check.reason;
        }
        if (!cs.photo)            errs[`cs_${i}_photo`]    = t.req;
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** Lleva la vista al inicio del formulario al cambiar de paso. */
  const scrollToForm = () => {
    const el = document.getElementById("postular");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const goNext = () => {
    if (!validate(step)) return;
    setDir(1);
    setStep((s) => s + 1);
    scrollToForm();
  };
  const goBack = () => {
    setDir(-1);
    setStep((s) => s - 1);
    scrollToForm();
  };

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ slug: string } | null>(null);

  const previewCard = (
    <SpeakerPreview
      firstName={form.firstName}
      lastName={form.lastName}
      tagline={form.tagline}
      talkTitle={form.talkTitle}
      photo={form.photo}
      level={form.audienceLevel}
      sessionType={form.sessionType}
      language={form.language}
    />
  );

  const summaryRows: SummaryRow[] = [
    { label: "charla", value: form.talkTitle },
    { label: "modalidad", value: form.sessionType === "online" ? "Online" : "Presencial" },
    { label: "track", value: TRACKS.find((x) => x.value === form.track)?.corto ?? "" },
    { label: "nivel", value: form.audienceLevel },
    { label: "idioma", value: form.language === "en" ? "English" : "Español" },
    { label: "nombre", value: `${form.firstName} ${form.lastName}`.trim() },
    { label: "cargo", value: form.tagline },
    { label: "correo", value: form.email },
    { label: "teléfono", value: `${findCountry(dialCode).dial} ${form.phone}`.trim() },
    { label: "ciudad", value: form.countryCity },
    { label: "co-speakers", value: String(form.coSpeakers.length) },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(2)) return;
    if (hasCaptcha && !captchaToken) {
      err("submit", t.captcha_required);
      return;
    }
    // Se manda de una; el repaso está en la pantalla de gracias.
    void send();
  };

  const send = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/speakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName,
          email: normalizeEmail(form.email).value, tagline: form.tagline, bio: form.bio,
          photo: form.photo, talkTitle: form.talkTitle, talkAbstract: form.talkAbstract,
          sessionType: form.sessionType, audienceLevel: form.audienceLevel, track: form.track,
          preRecordingDate: form.sessionType === "online" ? form.preRecordingDate : undefined,
          language: form.language, requirements: form.requirements,
          countryCity: form.countryCity,
          // Se manda con indicativo y sin separadores.
          phone: normalizePhone(form.phone, findCountry(dialCode)).value,
          firstTimeSpeaker: form.firstTimeSpeaker,
          social: form.social,
          coSpeakers: form.coSpeakers,
          captchaToken: captchaToken ?? "",
        }),
      });
      const data = await res.json() as { id?: string; slug?: string; error?: string };
      if (!res.ok) {
        err("submit", data.error ?? "Error al enviar");
        captchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }
      setSubmitted({ slug: data.slug ?? "" });
    } catch {
      err("submit", "Error de conexión");
      captchaRef.current?.reset();
      setCaptchaToken(null);
    }
    finally { setSubmitting(false); }
  };

  // ── Variants ────────────────────────────────────────────────────────────────
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  // ── Session type options ─────────────────────────────────────────────────────
  // Online se muestra pero no se puede elegir mientras EVENTO.cfp.online
  // esté apagado: se ve que la modalidad existe y que por ahora no va.
  const sessionTypeOpts = [
    { value: "online",    label: t.type_online,    desc: EVENTO.cfp.online ? t.type_online_desc : t.type_online_off,    icon: <Wifi className="h-5 w-5" />, disabled: !EVENTO.cfp.online },
    { value: "in-person", label: t.type_inperson,  desc: t.type_inperson_desc,  icon: <MapPin className="h-5 w-5" /> },
  ];

  /** Los cuatro tracks del evento, con sus temas. */
  const trackOpts = TRACKS.map((tr) => ({
    value: tr.value,
    label: (t as Record<string, string>)[`track_${tr.value.replace("-", "_")}`] ?? tr.label,
    desc: (t as Record<string, string>)[`track_${tr.value.replace("-", "_")}_desc`] ?? "",
    icon: <Layers className="h-5 w-5" />,
  }));

  const audienceLevelOpts = [
    { value: "100", label: t.level_100, desc: t.level_100_desc, icon: <GraduationCap className="h-5 w-5" /> },
    { value: "200", label: t.level_200, desc: t.level_200_desc, icon: <BookOpen className="h-5 w-5" /> },
    { value: "300", label: t.level_300, desc: t.level_300_desc, icon: <Layers className="h-5 w-5" /> },
    { value: "400", label: t.level_400, desc: t.level_400_desc, icon: <Cpu className="h-5 w-5" /> },
  ];

  // ── Estado del Call for Speakers (controlado desde el admin) ────────────────
  if (cfsOpen === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-900">
        <Loader2 className="h-8 w-8 animate-spin text-acento" />
      </main>
    );
  }
  if (cfsOpen === false) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-900 px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgb(var(--tema-acento-rgb)_/_0.07),transparent)]" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-xl text-center"
        >
          <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-acento">
            {EVENTO.nombreCompleto}
          </p>
          <h1 className="font-mono text-4xl font-bold text-surface-50 md:text-5xl leading-tight">
            La convocatoria cerró
          </h1>
          <p className="mt-6 font-mono text-base leading-relaxed text-surface-300">
            El Call for Speakers no está abierto en este momento.
            Los speakers seleccionados serán notificados directamente.
          </p>
          <p className="mt-4 font-mono text-sm leading-relaxed text-surface-400">
            El evento es el{" "}
            <strong className="text-surface-200">{fechaLarga(EVENTO.inicio, IDIOMA_BASE)}</strong> en {EVENTO.ciudad}.
            La entrada es gratuita: aún puedes ser parte.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 rounded-none bg-acento px-8 py-3.5 font-mono text-sm font-bold text-surface-900 transition-all hover:shadow-[0_0_30px_rgb(var(--tema-acento-rgb)_/_0.4)] active:scale-[0.98]"
            >
              Regístrate como participante
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/directorio"
              className="inline-flex items-center gap-2 rounded-none border border-acento/40 bg-acento/10 px-6 py-3 font-mono text-sm font-semibold text-acento transition-all hover:bg-acento hover:text-surface-900"
            >
              Ver speakers confirmados
            </Link>
          </div>
          <p className="mt-8 font-mono text-xs text-surface-400">
            {EVENTO.ciudad} · {fechaCorta(EVENTO.inicio)} · Gratuito
          </p>
        </motion.div>
      </main>
    );
  }

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
        "min-h-screen bg-surface-900",
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
            <DotHeading tone="block" variant="inverted">
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
          <form onSubmit={handleSubmit}>
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
                {step === 0 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="font-mono text-lg font-bold text-surface-50">{t.step1}</h2>
                      <p className="font-mono text-sm text-surface-400">{t.step1_desc}</p>
                    </div>

                    <Field label={t.talkTitle} error={errors.talkTitle}>
                      <TextInput value={form.talkTitle} onChange={(v) => { set("talkTitle", v); clearErr("talkTitle"); }} placeholder={t.talkTitle_ph} maxLength={80} />
                    </Field>

                    <Field label={t.description} error={errors.talkAbstract}>
                      <Textarea value={form.talkAbstract} onChange={(v) => { set("talkAbstract", v); clearErr("talkAbstract"); }} placeholder={t.description_ph} maxLength={1000} rows={5} />
                    </Field>

                    <Field label={t.sessionType} error={errors.sessionType}>
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
                            value={form.preRecordingDate}
                            onChange={(v) => { set("preRecordingDate", v); clearErr("preRecordingDate"); }}
                            placeholder={t.preRecordingDate_ph}
                            maxLength={100}
                            className="pl-10"
                          />
                        </div>
                      </Field>
                    )}

                    <Field label={t.track} error={errors.track}>
                      <CardSelector
                        options={trackOpts}
                        value={form.track as never}
                        onChange={(v) => { set("track", v); clearErr("track"); }}
                      />
                      <p className="mt-2 font-mono text-xs leading-relaxed text-surface-400">
                        {t.track_hint}
                      </p>
                    </Field>

                    <Field label={t.audienceLevel} error={errors.audienceLevel}>
                      <CardSelector
                        options={audienceLevelOpts}
                        value={form.audienceLevel as never}
                        onChange={(v) => { set("audienceLevel", v); clearErr("audienceLevel"); }}
                      />
                    </Field>

                    <Field label={t.lang_label}>
                      <div className="flex gap-3">
                        {([["es", t.lang_es], ["en", t.lang_en]] as const).map(([val, lbl]) => (
                          <button key={val} type="button" onClick={() => set("language", val)}
                            // Mismo tratamiento que CardSelector: elegido en tinta sólida.
                            className={cn(
                              "flex-1 border-2 py-3 font-mono text-xs font-bold transition-all",
                              form.language === val
                                ? "border-tinta bg-tinta text-acento shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
                                : "border-tinta/25 bg-white/30 text-tinta/70 hover:border-tinta hover:text-tinta",
                            )}
                          >{lbl}</button>
                        ))}
                      </div>
                    </Field>

                    <Field label={t.requirements}>
                      <Textarea value={form.requirements} onChange={(v) => set("requirements", v)} placeholder={t.requirements_ph} maxLength={300} rows={2} />
                    </Field>
                  </div>
                )}

                {/* ── Step 1: Speaker ── */}
                {step === 1 && (
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
                        <TextInput value={form.firstName} onChange={(v) => { set("firstName", v); clearErr("firstName"); }} placeholder={t.firstName_ph} maxLength={80} />
                      </Field>
                      <Field label={t.lastName} error={errors.lastName}>
                        <TextInput value={form.lastName} onChange={(v) => { set("lastName", v); clearErr("lastName"); }} placeholder={t.lastName_ph} maxLength={80} />
                      </Field>
                    </div>

                    <Field label={t.tagline} error={errors.tagline}>
                      <TextInput value={form.tagline} onChange={(v) => { set("tagline", v); clearErr("tagline"); }} placeholder={t.tagline_ph} maxLength={120} />
                    </Field>

                    <Field label={t.email} error={errors.email}>
                      <TextInput
                        value={form.email}
                        onChange={(v) => {
                          set("email", v);
                          clearErr("email");
                          setEmailHint(normalizeEmail(v).suggestion ?? "");
                        }}
                        onBlur={() => set("email", cleanWhitespace(form.email))}
                        placeholder="tu@email.com"
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
                        <TextInput value={form.countryCity} onChange={(v) => { set("countryCity", v); clearErr("countryCity"); }} placeholder={t.countryCity_ph} maxLength={80} />
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

                    <Field label={t.firstTime} error={errors.firstTimeSpeaker}>
                      <div className="flex gap-3">
                        {([true, false] as const).map((val) => (
                          <button key={String(val)} type="button" onClick={() => { set("firstTimeSpeaker", val); clearErr("firstTimeSpeaker"); }}
                            className={cn(
                              "flex-1 border-2 py-3 font-mono text-sm font-bold transition-all",
                              form.firstTimeSpeaker === val
                                ? "border-tinta bg-tinta text-acento shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
                                : "border-tinta/25 bg-white/30 text-tinta/70 hover:border-tinta hover:text-tinta",
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
                )}

                {/* ── Step 2: Details + Submit ── */}
                {step === 2 && (
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
                              <input value={cs.firstName} onChange={(e) => { updateCoSpeaker(i, { firstName: e.target.value }); clearErr(`cs_${i}_firstName`); }}
                                placeholder={t.coSpeaker_firstName_ph} maxLength={80}
                                className="w-full px-3 py-2.5 font-mono text-sm" />
                              {errors[`cs_${i}_firstName`] && <p className="font-mono text-xs text-error">{errors[`cs_${i}_firstName`]}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                              <input value={cs.lastName} onChange={(e) => { updateCoSpeaker(i, { lastName: e.target.value }); clearErr(`cs_${i}_lastName`); }}
                                placeholder={t.coSpeaker_lastName_ph} maxLength={80}
                                className="w-full px-3 py-2.5 font-mono text-sm" />
                              {errors[`cs_${i}_lastName`] && <p className="font-mono text-xs text-error">{errors[`cs_${i}_lastName`]}</p>}
                            </div>
                          </div>

                          {/* Email */}
                          <div className="mb-3 flex flex-col gap-1">
                            <input value={cs.email}
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
                      <label className={cn("flex cursor-pointer items-start gap-3 border p-3.5 transition-all", form.codeOfConduct ? "border-tinta/30 bg-tinta/5" : "border-tinta/20 bg-white/20 hover:border-tinta/25")}>
                        <div className="relative mt-0.5 shrink-0">
                          <input type="checkbox" checked={form.codeOfConduct} onChange={(e) => { set("codeOfConduct", e.target.checked); clearErr("codeOfConduct"); }} className="sr-only" />
                          <div className={cn("flex h-4.5 w-4.5 h-5 w-5 items-center justify-center rounded border-2 transition-all", form.codeOfConduct ? "border-tinta bg-tinta" : "border-tinta/20 bg-white/40")}>
                            {form.codeOfConduct && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                        <span className="font-mono text-xs text-surface-200 leading-relaxed">
                          {t.consent_conduct}{" "}
                          <Link href="/codigo-conducta" target="_blank" className="text-acento hover:underline">{t.conduct_link}</Link>
                        </span>
                      </label>
                      {errors.codeOfConduct && <p className="font-mono text-xs text-error px-1">{errors.codeOfConduct}</p>}

                      {/* Privacy */}
                      <label className={cn("flex cursor-pointer items-start gap-3 border p-3.5 transition-all", form.consent ? "border-tinta/30 bg-tinta/5" : "border-tinta/20 bg-white/20 hover:border-tinta/25")}>
                        <div className="relative mt-0.5 shrink-0">
                          <input type="checkbox" checked={form.consent} onChange={(e) => { set("consent", e.target.checked); clearErr("consent"); }} className="sr-only" />
                          <div className={cn("flex h-5 w-5 items-center justify-center rounded border-2 transition-all", form.consent ? "border-tinta bg-tinta" : "border-tinta/20 bg-white/40")}>
                            {form.consent && <CheckCircle2 className="h-3 w-3 text-white" />}
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
                )}
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
