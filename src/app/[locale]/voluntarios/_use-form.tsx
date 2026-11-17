"use client";

import { enfocarPrimerInvalido } from "@/components/forms/foco";
import { useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { type TurnstileHandle } from "@/components/ui/turnstile";
import { type SelectOption } from "@/components/forms/search-select";
import { DEFAULT_COUNTRY } from "@/components/forms/phone-input";
import { useHydrated } from "@/hooks/use-hydrated";
import { ROLE_GROUPS, labelOf, type Locale } from "@/data/attendee-form";
import { AVAILABILITY, DIETARY, SHIRT_SIZES, interestAreasLabelOf, type Option } from "@/data/volunteer-form";
import { cleanWhitespace, findCountry, normalizeDocument, normalizeEmail, normalizePhone } from "@/lib/normalize";
import type { SummaryRow } from "@/components/forms/success-screen";
import { copyFor } from "./_copy";
import { DOCUMENTOS, ROLES, ENTIDADES } from "@/config";

export const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export type VolunteerValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountry: string;
  documentType: string;
  documentNumber: string;
  role: string;
  roleOther: string;
  entityType: string;
  entityName: string;
  sbg: string;
  sbgOther: string;
  availability: string;
  interestAreas: string[];
  previousExperience: string;
  motivation: string;
  shirtSize: string;
  dietary: string;
  dietaryOther: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyCountry: string;
};


export const EMPTY: VolunteerValues = {
  firstName: "", lastName: "", email: "", phone: "", phoneCountry: DEFAULT_COUNTRY.code,
  documentType: "", documentNumber: "",
  role: "", roleOther: "", entityType: "", entityName: "",
  sbg: "", sbgOther: "",
  availability: "", interestAreas: [], previousExperience: "", motivation: "",
  shirtSize: "", dietary: "", dietaryOther: "",
  emergencyName: "", emergencyPhone: "", emergencyCountry: DEFAULT_COUNTRY.code,
};


export function useVoluntariosForm({ sbgs, onSubmit, onChange }: {
  /** Lista editable desde el panel, ya resuelta en el servidor. */
  sbgs: Option[];
  onSubmit: (values: Record<string, unknown>, captchaToken: string, resumen: SummaryRow[]) => Promise<void>;
  onChange?: (v: VolunteerValues) => void;
}) {
  // El formulario sigue el idioma de la página, igual que el de asistentes.
  const locale = (useLocale() === "en" ? "en" : "es") as Locale;
  const t = copyFor(locale);

  const [v, setV] = useState<VolunteerValues>(EMPTY);
  const [acceptCoc, setAcceptCoc] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<TurnstileHandle>(null);
  const captchaMounted = useHydrated() && !!siteKey;

  const set = <K extends keyof VolunteerValues>(k: K, value: VolunteerValues[K]) => {
    setV((prev) => {
      const next = { ...prev, [k]: value };
      onChange?.(next);
      return next;
    });
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: undefined }));
    if (formError) setFormError("");
  };

  const toggleArea = (code: string) => {
    // "Donde más se necesite" es excluyente: marcarla junto a otras áreas no
    // dice nada a la hora de armar los turnos.
    const next = code === "any"
      ? (v.interestAreas.includes("any") ? [] : ["any"])
      : v.interestAreas.includes(code)
        ? v.interestAreas.filter((a) => a !== code)
        : [...v.interestAreas.filter((a) => a !== "any"), code];
    set("interestAreas", next);
  };

  const docTypes = DOCUMENTOS;
  const roles = ROLES;
  const entities = ENTIDADES;

  const roleOptions: SelectOption[] = useMemo(
    () => roles.map((r) => ({
      value: r.value,
      label: labelOf(r, locale),
      group: labelOf(ROLE_GROUPS[r.group], locale),
    })),
    [roles, locale],
  );
  const entityOptions: SelectOption[] = useMemo(
    () => entities.map((e) => ({ value: e.value, label: labelOf(e, locale) })),
    [entities, locale],
  );
  const sbgOptions: SelectOption[] = useMemo(
    () => sbgs.map((x) => ({ value: x.value, label: labelOf(x, locale) })),
    [sbgs, locale],
  );

  const docRule = docTypes.find((d) => d.value === v.documentType)?.rule;
  const docExample = docTypes.find((d) => d.value === v.documentType)?.example;

  const needsRoleOther = v.role === "other";
  const needsEntityName = !!v.entityType && v.entityType !== "none";
  const needsSbgOther = v.sbg === "other";
  const needsDietaryOther = v.dietary === "other";

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!cleanWhitespace(v.firstName)) e.firstName = t.e_firstName;
    if (!cleanWhitespace(v.lastName)) e.lastName = t.e_lastName;

    const mail = normalizeEmail(v.email);
    if (!mail.ok) e.email = mail.reason ?? t.e_email;

    const tel = normalizePhone(v.phone, findCountry(v.phoneCountry));
    if (!tel.ok) e.phone = tel.reason;

    // El documento no es opcional acá: el voluntariado es presencial y el
    // equipo entra a la sede antes que el público.
    if (!v.documentType) e.documentType = t.e_docType;
    else {
      const rule = docTypes.find((d) => d.value === v.documentType)!.rule;
      const doc = normalizeDocument(v.documentNumber, rule);
      if (!doc.ok) e.documentNumber = doc.reason;
    }

    if (!v.role) e.role = t.e_role;
    if (needsRoleOther && !cleanWhitespace(v.roleOther)) e.roleOther = t.e_roleOther;
    if (!v.entityType) e.entityType = t.e_entityType;
    if (needsEntityName && !cleanWhitespace(v.entityName)) e.entityName = t.e_entityName;
    if (!v.sbg) e.sbg = t.e_sbg;
    if (needsSbgOther && !cleanWhitespace(v.sbgOther)) e.sbgOther = t.e_sbgOther;

    if (!v.availability) e.availability = t.e_availability;
    if (!v.interestAreas.length) e.interestAreas = t.e_areas;
    if (!v.previousExperience) e.previousExperience = t.e_experience;

    if (!v.shirtSize) e.shirtSize = t.e_shirt;
    if (!v.dietary) e.dietary = t.e_dietary;
    if (needsDietaryOther && !cleanWhitespace(v.dietaryOther)) {
      e.dietaryOther = t.e_dietaryOther;
    }
    if (!cleanWhitespace(v.emergencyName)) e.emergencyName = t.e_emergency;
    const emTel = normalizePhone(v.emergencyPhone, findCountry(v.emergencyCountry));
    if (!emTel.ok) e.emergencyPhone = emTel.reason;

    if (!acceptCoc) e.coc = t.e_coc;
    if (!acceptPrivacy) e.privacy = t.e_privacy;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** Lo que se envía: códigos ya normalizados, no etiquetas. */
  const build = (): Record<string, unknown> => {
    const doc = docRule ? normalizeDocument(v.documentNumber, docRule) : null;
    const tel = normalizePhone(v.phone, findCountry(v.phoneCountry));
    const emTel = normalizePhone(v.emergencyPhone, findCountry(v.emergencyCountry));
    return {
      firstName: cleanWhitespace(v.firstName),
      lastName: cleanWhitespace(v.lastName),
      email: normalizeEmail(v.email).value,
      // Los teléfonos viajan con indicativo, en un solo campo: es como se
      // marcan y como los va a copiar quien coordine el día del evento.
      phone: tel.ok ? tel.value : "",
      documentType: v.documentType,
      documentNumber: doc?.ok ? doc.value : v.documentNumber,
      role: v.role,
      roleOther: needsRoleOther ? cleanWhitespace(v.roleOther) : "",
      entityType: v.entityType,
      entityName: needsEntityName ? cleanWhitespace(v.entityName) : "",
      // El SBG viaja con su nombre: la lista es editable desde el panel, así
      // que no hay catálogo fijo contra el que traducir un código.
      sbg: needsSbgOther ? cleanWhitespace(v.sbgOther) : v.sbg,
      availability: v.availability,
      interestAreas: v.interestAreas,
      previousExperience: v.previousExperience,
      motivation: cleanWhitespace(v.motivation),
      shirtSize: v.shirtSize,
      dietary: v.dietary,
      dietaryOther: needsDietaryOther ? cleanWhitespace(v.dietaryOther) : "",
      emergencyName: cleanWhitespace(v.emergencyName),
      emergencyPhone: emTel.ok ? emTel.value : "",
      acceptCoc: "true",
      acceptPrivacy: "true",
    };
  };

  const send = async () => {
    setSubmitting(true);
    setFormError("");
    try {
      await onSubmit(build(), captchaToken, summaryRows);
    } catch (err) {
      setFormError((err as Error).message);
      setCaptchaToken("");
      captchaRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      enfocarPrimerInvalido(e.currentTarget);
      return;
    }
    // Se envía de una; el repaso está en la pantalla de gracias.
    void send();
  };

  const docLabel = (() => {
    const d = docTypes.find((x) => x.value === v.documentType);
    return d ? labelOf(d, locale) : "";
  })();
  const telefono = normalizePhone(v.phone, findCountry(v.phoneCountry));
  const telEmergencia = normalizePhone(v.emergencyPhone, findCountry(v.emergencyCountry));

  const opt = (lista: Option[], code: string) => {
    const o = lista.find((x) => x.value === code);
    return o ? labelOf(o, locale) : "";
  };

  const summaryRows: SummaryRow[] = [
    { label: t.r_name, value: `${v.firstName} ${v.lastName}`.trim() },
    { label: t.r_email, value: v.email },
    { label: t.r_phone, value: telefono.ok ? telefono.value : v.phone },
    { label: t.r_doc, value: `${docLabel} ${v.documentNumber}`.trim() },
    {
      label: t.r_entity,
      value: v.entityName || opt(entities, v.entityType),
    },
    { label: t.r_sbg, value: needsSbgOther ? v.sbgOther : v.sbg === "none" ? t.r_none : v.sbg },
    { label: t.r_availability, value: opt(AVAILABILITY, v.availability) },
    { label: t.r_areas, value: interestAreasLabelOf(v.interestAreas, locale) },
    { label: t.r_shirt, value: opt(SHIRT_SIZES, v.shirtSize) },
    {
      label: t.r_dietary,
      value: needsDietaryOther ? v.dietaryOther : opt(DIETARY, v.dietary),
    },
    {
      label: t.r_emergency,
      value: `${v.emergencyName} · ${telEmergencia.ok ? telEmergencia.value : v.emergencyPhone}`.trim(),
    },
  ];

  return {
    locale,
    t,
    v,
    setV,
    acceptCoc,
    setAcceptCoc,
    acceptPrivacy,
    setAcceptPrivacy,
    errors,
    setErrors,
    submitting,
    setSubmitting,
    formError,
    setFormError,
    captchaToken,
    setCaptchaToken,
    captchaRef,
    captchaMounted,
    set,
    toggleArea,
    docTypes,
    roles,
    entities,
    roleOptions,
    entityOptions,
    sbgOptions,
    docRule,
    docExample,
    needsRoleOther,
    needsEntityName,
    needsSbgOther,
    needsDietaryOther,
    validate,
    build,
    send,
    handleSubmit,
    docLabel,
    telefono,
    telEmergencia,
    opt,
    summaryRows,
  };
}

export type Formulario = ReturnType<typeof useVoluntariosForm>;
