/** Las opciones del formulario de asistentes. */

import { DOCUMENTOS, ENTIDADES, ROLES } from "@/config";
import type { Idioma, RoleGroup, Traducible } from "@/config/tipos";

export type { DocRule, DocType, EntityType, RoleGroup, RoleOption, Traducible } from "@/config/tipos";
export type Locale = Idioma;

/** El texto de una opción en el idioma pedido; cae al español si no está traducida. */
export function labelOf(o: Traducible, locale: Locale = "es"): string {
  if (locale === "en") return o.en;
  if (locale === "pt") return o.pt ?? o.label;
  return o.label;
}

export const ROLE_GROUPS: Record<RoleGroup, Traducible> = {
  students: { label: "Estudiantes", en: "Students", pt: "Estudantes" },
  teaching: { label: "Docencia", en: "Teaching", pt: "Docência" },
  work: { label: "Trabajo", en: "Work", pt: "Trabalho" },
  other: { label: "Otro", en: "Other", pt: "Outro" },
};

/** Máximo para los campos de texto libre («Otro» y el nombre de la entidad). */
export const FREE_TEXT_MAX = 80;

const ASISTENCIA: Record<"online" | "in-person", Traducible> = {
  online: { label: "Online", en: "Online", pt: "Online" },
  "in-person": { label: "Presencial", en: "In person", pt: "Presencial" },
};

// Si un código ya no está en el catálogo se devuelve tal cual: es feo, pero
// pierde menos información que no mostrar nada.

export function attendanceLabelOf(code: string, locale: Locale = "es"): string {
  return labelOf(ASISTENCIA[code === "online" ? "online" : "in-person"], locale);
}

export function roleLabelOf(code: string, other?: string | null, locale: Locale = "es"): string {
  if (code === "other") return other || labelOf(ROLE_GROUPS.other, locale);
  const o = ROLES.find((r) => r.value === code);
  return o ? labelOf(o, locale) : code;
}

export function entityLabelOf(code: string, locale: Locale = "es"): string {
  const o = ENTIDADES.find((e) => e.value === code);
  return o ? labelOf(o, locale) : code;
}

export function docTypeLabelOf(code: string | null, locale: Locale = "es"): string {
  if (!code) return "";
  const o = DOCUMENTOS.find((d) => d.value === code);
  return o ? labelOf(o, locale) : code;
}
