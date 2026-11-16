/** Textos del formulario de asistentes, en los dos idiomas. */

export const COPY = {
  es: {
    firstName: "Nombre(s)",
    firstName_ph: "",
    lastName: "Apellido(s)",
    lastName_ph: "",
    email: "Correo electrónico",
    email_hint: "",
    email_ph: "tu@correo.com",

    attendance: "¿Cómo vas a asistir?",
    inPerson: "Presencial",
    online: "Virtual",

    docType: "Tipo de documento",
    docNumber: "Número de documento",
    select: "Selecciona",
    searchType: "Buscar tipo…",

    role: "¿A qué te dedicas?",
    role_ph: "Selecciona",
    searchRole: "Buscar rol…",
    which: "¿Cuál?",
    which_ph: "Escríbelo con tus palabras",

    entity: "¿Dónde estudias o trabajas?",
    entity_ph: "Universidad, empresa, colegio…",
    search: "Buscar…",
    entityName: (tipo: string) => `Nombre de tu ${tipo}`,
    entityName_ph: "Escríbelo completo",

    coc_text: "He leído y acepto el ",
    coc_link: "Código de Conducta",
    privacy_text: "Autorizo el tratamiento de mis datos personales conforme a la ",
    privacy_link: "Política de Privacidad",

    volunteers_q: "¿Buscabas el ",
    volunteers_strong: "equipo de voluntarios",
    volunteers_rest: "? Entonces este no es tu formulario: ",
    volunteers_link: "postúlate acá",

    captcha: "Comprobando que no eres un robot…",
    submit: "Registrarme",
    sending: "Enviando…",

    // Resumen que se muestra en la pantalla de gracias
    r_name: "nombre",
    r_email: "correo",
    r_mode: "modalidad",
    r_doc: "documento",
    r_role: "rol",
    r_entity: "entidad",

    // Errores
    e_firstName: "Escribe tu nombre.",
    e_lastName: "Escribe tu apellido.",
    e_email: "Escribe un correo válido, como nombre@dominio.com.",
    e_attendance: "Elige cómo vas a asistir.",
    e_docType: "Elige el tipo de documento.",
    e_role: "Elige a qué te dedicas.",
    e_roleOther: "Cuéntanos cuál.",
    e_entityType: "Elige dónde estudias o trabajas.",
    e_entityName: "Escribe el nombre de tu institución u organización.",
    e_coc: "Necesitamos que aceptes el código de conducta.",
    e_privacy: "Necesitamos tu autorización para tratar tus datos.",
  },
  en: {
    firstName: "First name(s)",
    firstName_ph: "",
    lastName: "Last name(s)",
    lastName_ph: "",
    email: "Email address",
    email_hint: "",
    email_ph: "you@email.com",

    attendance: "How will you attend?",
    inPerson: "In person",
    online: "Online",

    docType: "ID type",
    docNumber: "ID number",
    select: "Select",
    searchType: "Search type…",

    role: "What do you do?",
    role_ph: "Select",
    searchRole: "Search role…",
    which: "Which one?",
    which_ph: "Tell us in your own words",

    entity: "Where do you study or work?",
    entity_ph: "University, company, school…",
    search: "Search…",
    entityName: (tipo: string) => `Name of your ${tipo}`,
    entityName_ph: "Write it in full",

    coc_text: "I have read and accept the ",
    coc_link: "Code of Conduct",
    privacy_text: "I authorise the processing of my personal data under the ",
    privacy_link: "Privacy Policy",

    volunteers_q: "Were you looking for the ",
    volunteers_strong: "volunteer team",
    volunteers_rest: "? Then this is not your form: ",
    volunteers_link: "apply here",

    captcha: "Checking you are not a robot…",
    submit: "Register",
    sending: "Sending…",

    r_name: "name",
    r_email: "email",
    r_mode: "mode",
    r_doc: "id",
    r_role: "role",
    r_entity: "organisation",

    e_firstName: "Enter your first name.",
    e_lastName: "Enter your last name.",
    e_email: "Enter a valid email, like name@domain.com.",
    e_attendance: "Choose how you will attend.",
    e_docType: "Choose the ID type.",
    e_role: "Choose what you do.",
    e_roleOther: "Tell us which one.",
    e_entityType: "Choose where you study or work.",
    e_entityName: "Enter the name of your institution or organization.",
    e_coc: "You need to accept the code of conduct.",
    e_privacy: "We need your authorisation to process your data.",
  },
} as const;

export type CopyLocale = keyof typeof COPY;

/** El idioma de la página, acotado a los que este formulario tiene. */
export function copyFor(locale: string) {
  return COPY[locale === "en" ? "en" : "es"];
}
