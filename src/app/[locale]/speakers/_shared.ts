// i18n local (switcher independiente del locale), tipos y helpers del formulario de speakers.

/** Idiomas del formulario: el que elige quien postula, con independencia del idioma del sitio. */
export type Lang = "es" | "en";

/** Los textos del formulario (`Postulacion` en `src/messages`), ya con los datos de la edición. */
export type Textos = Record<keyof typeof import("@/messages/es.json")["Postulacion"], string>;
export type TextosPorIdioma = Record<Lang, Textos>;
export type CoSpeaker = {
  firstName: string; lastName: string; email: string;
  bio: string; photo: string;
  social: { linkedin: string; twitter: string; instagram: string };
};

export const emptyCoSpeaker = (): CoSpeaker => ({
  firstName: "", lastName: "", email: "", bio: "", photo: "",
  social: { linkedin: "", twitter: "", instagram: "" },
});

