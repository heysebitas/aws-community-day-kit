/**
 * La estructura de la convocatoria de speakers. Los textos salen de i18n
 * («CFP») y las fechas de `evento/config.ts`.
 */

/** Hitos del proceso, en orden cronológico. El texto sale de i18n ("CFP"). */
export const cfpMilestones = [
  {
    id: "close",
    dateKey: "milestone_close_date",
    titleKey: "milestone_close_title",
    descKey: "milestone_close_desc",
    highlight: true,
  },
  {
    id: "review",
    dateKey: "milestone_review_date",
    titleKey: "milestone_review_title",
    descKey: "milestone_review_desc",
    highlight: false,
  },
  {
    id: "notify",
    dateKey: "milestone_notify_date",
    titleKey: "milestone_notify_title",
    descKey: "milestone_notify_desc",
    highlight: false,
  },
  {
    id: "slides",
    dateKey: "milestone_slides_date",
    titleKey: "milestone_slides_title",
    descKey: "milestone_slides_desc",
    highlight: false,
  },
] as const;

/** Modalidades de sesión aceptadas. */
export const cfpFormats = [
  {
    id: "talk",
    icon: "Mic",
    durationKey: "format_talk_duration",
    titleKey: "format_talk_title",
    descKey: "format_talk_desc",
  },
  {
    id: "workshop",
    icon: "Laptop",
    durationKey: "format_workshop_duration",
    titleKey: "format_workshop_title",
    descKey: "format_workshop_desc",
  },
] as const;

/** Criterios de selección que se muestran a quien postula. */
export const cfpCriteria = [
  { id: "anonymous", icon: "ClipboardList", titleKey: "criteria_anonymous_title", descKey: "criteria_anonymous_desc" },
  { id: "educational", icon: "GraduationCap", titleKey: "criteria_educational_title", descKey: "criteria_educational_desc" },
  { id: "ai", icon: "Sparkles", titleKey: "criteria_ai_title", descKey: "criteria_ai_desc" },
] as const;
