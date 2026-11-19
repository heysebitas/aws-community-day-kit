"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TRACKS } from "@/data/session-tracks";
import { useLocale, useTranslations } from "next-intl";
import { type TurnstileHandle } from "@/components/ui/turnstile";
import { SpeakerPreview } from "@/components/forms/previews";
import { type SummaryRow } from "@/components/forms/success-screen";
import { useCountdown } from "@/hooks/use-countdown";
import { cleanWhitespace, findCountry, normalizeEmail, normalizePhone, DEFAULT_COUNTRY } from "@/lib/normalize";
import { Wifi, MapPin, GraduationCap, BookOpen, Layers, Cpu } from "lucide-react";
import { normalizeLink } from "@/lib/normalize";
import { toSlug } from "@/lib/slug";
import { pedirJson } from "@/lib/pedir-json";
import { type Lang, type CoSpeaker, type TextosPorIdioma } from "./_shared";
import { enfocarPrimerInvalido } from "@/components/forms/foco";
import { EVENTO } from "@/config";

export function useSpeakersScreen(pasoInicial: number, textos: TextosPorIdioma) {
  const tf = useTranslations("Forms");
  const locale = useLocale();
  const [lang, setLang] = useState<Lang>("es");
  const t = textos[lang];
  const [step, setStep] = useState(pasoInicial);
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
      arr[i] = { ...arr[i]!, ...patch };
      return { ...f, coSpeakers: arr };
    });
  const updateCoSpeakerSocial = (i: number, k: keyof CoSpeaker["social"], v: string) =>
    setForm((f) => {
      const arr = [...f.coSpeakers];
      arr[i] = { ...arr[i]!, social: { ...arr[i]!.social, [k]: v } };
      return { ...f, coSpeakers: arr };
    });

  // hCaptcha
  const formRef = useRef<HTMLFormElement>(null);
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
    if (!validate(step)) { enfocarPrimerInvalido(formRef.current); return; }
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
    if (!validate(2)) { enfocarPrimerInvalido(formRef.current); return; }
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
      const res = await pedirJson<{ slug?: string }>("/api/speakers", {
        method: "POST",
        body: {
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
        },
        errorPorDefecto: "Error al enviar",
      });
      if (!res.ok) {
        err("submit", res.error ?? "Error al enviar");
        captchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }
      setSubmitted({ slug: res.data.slug ?? "" });
    } finally { setSubmitting(false); }
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

  return {
    tf,
    locale,
    lang,
    setLang,
    t,
    step,
    setStep,
    dialCode,
    setDialCode,
    emailHint,
    setEmailHint,
    dir,
    setDir,
    isExpired,
    isActive,
    cfsOpen,
    form,
    setForm,
    set,
    setSocial,
    socialErrors,
    setSocialErrors,
    checkCoSpeakerSocial,
    checkSocial,
    updateCoSpeaker,
    updateCoSpeakerSocial,
    formRef,
    captchaRef,
    captchaToken,
    setCaptchaToken,
    captchaMounted,
    setCaptchaMounted,
    siteKey,
    hasCaptcha,
    computedSlug,
    errors,
    setErrors,
    err,
    clearErr,
    validate,
    scrollToForm,
    goNext,
    goBack,
    submitting,
    setSubmitting,
    submitted,
    setSubmitted,
    previewCard,
    summaryRows,
    handleSubmit,
    send,
    variants,
    sessionTypeOpts,
    trackOpts,
    audienceLevelOpts,
  };
}

export type Pantalla = ReturnType<typeof useSpeakersScreen>;
