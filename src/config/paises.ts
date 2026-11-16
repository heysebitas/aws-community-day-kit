import type { CodigoPais, DocType, EntityType, Pais, RoleOption } from "./tipos";

/**
 * Lo que cambia de un país a otro: documentos, teléfono, zona horaria y cómo se
 * llaman los niveles de estudio.
 *
 * Para añadir o corregir un país basta con su entrada en `PAISES`. Un documento
 * sólo lleva validación estricta (`run`, `cpf`, `curp`) cuando el algoritmo es
 * público y estable; en la duda va `digits` o `loose`, porque rechazar un
 * documento válido en la puerta es peor que aceptar uno con una errata.
 */

/** A un evento abierto siempre llega gente de fuera: estas dos opciones van en todos los países. */
const EXTRANJEROS: DocType[] = [
  {
    value: "PASSPORT",
    label: "Pasaporte",
    en: "Passport",
    pt: "Passaporte",
    example: "AB1234567",
    rule: { kind: "loose", min: 5, max: 20 },
  },
  {
    value: "FOREIGN",
    label: "Documento extranjero / Otro",
    en: "Foreign ID / Other",
    pt: "Documento estrangeiro / Outro",
    example: "Número de tu documento",
    exampleEn: "Your document number",
    rule: { kind: "loose", min: 4, max: 20 },
  },
];

const ROLES_COMUNES: RoleOption[] = [
  { value: "postgrad", label: "Estudiante de posgrado", en: "Postgraduate student", pt: "Estudante de pós-graduação", group: "students" },
  { value: "teacher", label: "Docente / Profesor", en: "Teacher / Professor", pt: "Docente / Professor", group: "teaching" },
  { value: "researcher", label: "Investigador", en: "Researcher", pt: "Pesquisador", group: "teaching" },
  { value: "professional", label: "Profesional / Trabajador", en: "Professional / Employed", pt: "Profissional / Empregado", group: "work" },
  { value: "founder", label: "Emprendedor / Fundador", en: "Founder / Entrepreneur", pt: "Empreendedor / Fundador", group: "work" },
  { value: "freelance", label: "Independiente / Freelance", en: "Freelance / Self-employed", pt: "Autônomo / Freelancer", group: "work" },
  { value: "jobseeker", label: "Buscando trabajo", en: "Looking for work", pt: "Em busca de emprego", group: "work" },
  { value: "other", label: "Otro", en: "Other", pt: "Outro", group: "other" },
];

const UNIVERSITARIO: RoleOption = {
  value: "student_university", label: "Estudiante universitario", en: "University student", pt: "Estudante universitário", group: "students",
};

/** Para los países que no tienen niveles propios que valga la pena distinguir. */
const ESTUDIANTES: RoleOption[] = [
  UNIVERSITARIO,
  { value: "student_tech", label: "Estudiante técnico o tecnológico", en: "Technical or vocational student", group: "students" },
  { value: "student_school", label: "Estudiante de colegio o secundaria", en: "High school student", group: "students" },
];

const EMPRESA: EntityType = { value: "company", label: "Empresa", en: "Company", pt: "Empresa" };
const ORG: EntityType = { value: "org", label: "Organización o comunidad", en: "Organisation or community", pt: "Organização ou comunidade" };
const NINGUNA: EntityType = { value: "none", label: "Ninguna / Independiente", en: "None / Independent", pt: "Nenhuma / Independente" };
const UNIVERSIDAD: EntityType = { value: "university", label: "Universidad", en: "University", pt: "Universidade" };

const ENTIDADES: EntityType[] = [
  UNIVERSIDAD,
  { value: "tech", label: "Instituto técnico o tecnológico", en: "Technical or vocational institute" },
  { value: "school", label: "Colegio", en: "School" },
  EMPRESA, ORG, NINGUNA,
];

const cedula = (min: number, max: number, example: string, label = "Cédula de identidad", en = "National ID card"): DocType => ({
  value: "CI", label, en, example, rule: { kind: "digits", min, max },
});

type Datos = Pais["datos"];

const AUTORIDAD: Datos["autoridad"] = {
  label: "la autoridad de protección de datos o los tribunales competentes",
  en: "the data protection authority or the competent courts",
};

const ley = (label: string, en: string, autoridad?: [string, string]): Datos => ({
  ley: { label, en },
  autoridad: autoridad ? { label: autoridad[0], en: autoridad[1] } : AUTORIDAD,
});

/**
 * La ley de protección de datos de cada país, para la política de privacidad.
 * Donde no hay una ley general —o no estamos seguros de cuál rige— se cita «la
 * normativa vigente» en vez de inventar una referencia.
 */
const LEYES: Partial<Record<CodigoPais, Datos>> = {
  AR: ley("la Ley N° 25.326 de Protección de los Datos Personales", "Law No. 25,326 on Personal Data Protection",
    ["la Agencia de Acceso a la Información Pública (AAIP)", "the Agency for Access to Public Information (AAIP)"]),
  BR: ley("la Lei nº 13.709/2018 (LGPD)", "Law No. 13,709/2018 (LGPD)",
    ["la Autoridade Nacional de Proteção de Dados (ANPD)", "the National Data Protection Authority (ANPD)"]),
  CL: ley("la Ley N° 19.628 sobre Protección de la Vida Privada y la Ley N° 21.719 que la actualiza", "Law No. 19,628 on the Protection of Private Life and Law No. 21,719, which updates it",
    ["la Agencia de Protección de Datos Personales o los tribunales competentes", "the Personal Data Protection Agency or the competent courts"]),
  CO: ley("la Ley 1581 de 2012 y sus decretos reglamentarios", "Law 1581 of 2012 and its regulatory decrees",
    ["la Superintendencia de Industria y Comercio (SIC)", "the Superintendence of Industry and Commerce (SIC)"]),
  CR: ley("la Ley N° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales", "Law No. 8968 on the Protection of Individuals regarding the Processing of their Personal Data",
    ["la Agencia de Protección de Datos de los Habitantes (PRODHAB)", "the Data Protection Agency (PRODHAB)"]),
  CU: ley("la Ley 149 de Protección de Datos Personales", "Law 149 on Personal Data Protection"),
  DO: ley("la Ley No. 172-13 sobre Protección de Datos de Carácter Personal", "Law No. 172-13 on Personal Data Protection"),
  EC: ley("la Ley Orgánica de Protección de Datos Personales", "the Organic Law on Personal Data Protection",
    ["la Superintendencia de Protección de Datos Personales", "the Superintendence of Personal Data Protection"]),
  MX: ley("la Ley Federal de Protección de Datos Personales en Posesión de los Particulares", "the Federal Law on Protection of Personal Data Held by Private Parties"),
  NI: ley("la Ley N° 787 de Protección de Datos Personales", "Law No. 787 on Personal Data Protection"),
  PA: ley("la Ley 81 de 2019 sobre Protección de Datos Personales", "Law 81 of 2019 on Personal Data Protection",
    ["la Autoridad Nacional de Transparencia y Acceso a la Información (ANTAI)", "the National Authority for Transparency and Access to Information (ANTAI)"]),
  PE: ley("la Ley N° 29733 de Protección de Datos Personales", "Law No. 29733 on Personal Data Protection",
    ["la Autoridad Nacional de Protección de Datos Personales", "the National Authority for Personal Data Protection"]),
  UY: ley("la Ley N° 18.331 de Protección de Datos Personales", "Law No. 18,331 on Personal Data Protection",
    ["la Unidad Reguladora y de Control de Datos Personales (URCDP)", "the Personal Data Regulatory and Control Unit (URCDP)"]),
};

type Base = Omit<Pais, "documentos" | "estudiantes" | "entidades" | "datos"> & {
  documentos: DocType[];
  estudiantes?: RoleOption[];
  entidades?: EntityType[];
};

const definir = (p: Base): Pais => ({
  ...p,
  documentos: [...p.documentos, ...EXTRANJEROS],
  estudiantes: p.estudiantes ?? ESTUDIANTES,
  entidades: p.entidades ?? ENTIDADES,
  datos: LEYES[p.codigo] ?? ley(
    `la normativa de protección de datos personales vigente en ${p.nombre}`,
    `the personal data protection regulations in force in ${p.nombreEn}`,
  ),
});

export const PAISES: Record<CodigoPais, Pais> = {
  AR: definir({
    codigo: "AR", nombre: "Argentina", nombreEn: "Argentina", bandera: "🇦🇷", locale: "es-AR",
    zona: "America/Argentina/Buenos_Aires",
    telefono: { prefijo: "+54", digitos: [10, 11] },
    capital: { nombre: "Buenos Aires", lat: -34.6, lon: -58.38 },
    documentos: [{ value: "DNI", label: "DNI", en: "DNI", example: "34123456", rule: { kind: "digits", min: 7, max: 8 } }],
    estudiantes: [
      UNIVERSITARIO,
      { value: "student_terciario", label: "Estudiante terciario", en: "Tertiary student", group: "students" },
      { value: "student_school", label: "Estudiante secundario", en: "Secondary school student", group: "students" },
    ],
    entidades: [
      UNIVERSIDAD,
      { value: "terciario", label: "Instituto terciario", en: "Tertiary institute" },
      { value: "school", label: "Escuela secundaria", en: "Secondary school" },
      EMPRESA, ORG, NINGUNA,
    ],
  }),

  BO: definir({
    codigo: "BO", nombre: "Bolivia", nombreEn: "Bolivia", bandera: "🇧🇴", locale: "es-BO",
    zona: "America/La_Paz",
    telefono: { prefijo: "+591", digitos: 8 },
    capital: { nombre: "La Paz", lat: -16.5, lon: -68.15 },
    // Puede llevar extensión («1234567-1A»), así que no se exige sólo dígitos.
    documentos: [{ value: "CI", label: "Cédula de identidad", en: "National ID card", example: "1234567", rule: { kind: "loose", min: 5, max: 12 } }],
  }),

  BR: definir({
    codigo: "BR", nombre: "Brasil", nombreEn: "Brazil", bandera: "🇧🇷", locale: "pt-BR",
    zona: "America/Sao_Paulo",
    telefono: { prefijo: "+55", digitos: [10, 11] },
    capital: { nombre: "Brasília", lat: -15.79, lon: -47.88 },
    documentos: [
      { value: "CPF", label: "CPF", en: "CPF", pt: "CPF", example: "123.456.789-09", rule: { kind: "cpf" } },
      { value: "RG", label: "RG / Carteira de Identidade", en: "RG / State ID", pt: "RG / Carteira de Identidade", example: "12.345.678-9", rule: { kind: "loose", min: 5, max: 14 } },
    ],
    estudiantes: [
      { value: "student_university", label: "Estudiante de graduación", en: "Undergraduate student", pt: "Estudante de graduação", group: "students" },
      { value: "student_tech", label: "Estudiante de curso técnico o tecnólogo", en: "Technical course student", pt: "Estudante de curso técnico ou tecnólogo", group: "students" },
      { value: "student_school", label: "Estudiante de enseñanza media", en: "High school student", pt: "Estudante do ensino médio", group: "students" },
    ],
    entidades: [
      UNIVERSIDAD,
      { value: "tech", label: "Instituto federal o escuela técnica", en: "Federal institute or technical school", pt: "Instituto federal ou escola técnica" },
      { value: "school", label: "Colegio", en: "School", pt: "Escola" },
      EMPRESA, ORG, NINGUNA,
    ],
  }),

  CL: definir({
    codigo: "CL", nombre: "Chile", nombreEn: "Chile", bandera: "🇨🇱", locale: "es-CL",
    zona: "America/Santiago",
    telefono: { prefijo: "+56", digitos: 9 },
    capital: { nombre: "Santiago", lat: -33.45, lon: -70.66 },
    documentos: [{ value: "RUN", label: "RUN / Cédula de identidad", en: "RUN / National ID", example: "12.345.678-5", rule: { kind: "run" } }],
    // Un IP y un CFT son instituciones distintas de la universidad: sin estas
    // opciones, quien estudia ahí termina eligiendo «Otro».
    estudiantes: [
      UNIVERSITARIO,
      { value: "student_ip", label: "Estudiante de Instituto Profesional (IP)", en: "Professional Institute (IP) student", group: "students" },
      { value: "student_cft", label: "Estudiante de Centro de Formación Técnica (CFT)", en: "Technical Training Centre (CFT) student", group: "students" },
      { value: "student_school", label: "Estudiante de enseñanza media", en: "High school student", group: "students" },
    ],
    entidades: [
      UNIVERSIDAD,
      { value: "ip", label: "Instituto Profesional", en: "Professional Institute (IP)" },
      { value: "cft", label: "Centro de Formación Técnica", en: "Technical Training Centre (CFT)" },
      { value: "school", label: "Colegio / Liceo", en: "School" },
      EMPRESA, ORG, NINGUNA,
    ],
  }),

  CO: definir({
    codigo: "CO", nombre: "Colombia", nombreEn: "Colombia", bandera: "🇨🇴", locale: "es-CO",
    zona: "America/Bogota",
    telefono: { prefijo: "+57", digitos: 10 },
    capital: { nombre: "Bogotá", lat: 4.71, lon: -74.07 },
    documentos: [
      { value: "CC", label: "Cédula de ciudadanía", en: "National ID card (CC)", example: "1012345678", rule: { kind: "digits", min: 6, max: 10 } },
      { value: "TI", label: "Tarjeta de identidad", en: "Youth ID card (TI)", example: "1012345678", rule: { kind: "digits", min: 8, max: 11 } },
      { value: "CE", label: "Cédula de extranjería", en: "Foreigner ID card (CE)", example: "1234567", rule: { kind: "digits", min: 5, max: 8 } },
      { value: "PPT", label: "Permiso por Protección Temporal", en: "Temporary Protection Permit (PPT)", example: "1234567", rule: { kind: "digits", min: 5, max: 12 } },
    ],
    estudiantes: [
      UNIVERSITARIO,
      { value: "student_tech", label: "Estudiante técnico o tecnólogo", en: "Technical or technologist student", group: "students" },
      { value: "student_sena", label: "Aprendiz SENA", en: "SENA apprentice", group: "students" },
      { value: "student_school", label: "Estudiante de colegio", en: "School student", group: "students" },
    ],
    entidades: [
      UNIVERSIDAD,
      { value: "tech", label: "Institución técnica o tecnológica", en: "Technical or technological institution" },
      { value: "sena", label: "SENA", en: "SENA" },
      { value: "school", label: "Colegio", en: "School" },
      EMPRESA, ORG, NINGUNA,
    ],
  }),

  CR: definir({
    codigo: "CR", nombre: "Costa Rica", nombreEn: "Costa Rica", bandera: "🇨🇷", locale: "es-CR",
    zona: "America/Costa_Rica",
    telefono: { prefijo: "+506", digitos: 8 },
    capital: { nombre: "San José", lat: 9.93, lon: -84.08 },
    documentos: [
      cedula(9, 9, "101230456"),
      { value: "DIMEX", label: "DIMEX", en: "DIMEX (resident ID)", example: "112345678901", rule: { kind: "digits", min: 11, max: 12 } },
    ],
  }),

  CU: definir({
    codigo: "CU", nombre: "Cuba", nombreEn: "Cuba", bandera: "🇨🇺", locale: "es-CU",
    zona: "America/Havana",
    telefono: { prefijo: "+53", digitos: 8 },
    capital: { nombre: "La Habana", lat: 23.11, lon: -82.37 },
    documentos: [cedula(11, 11, "85010112345", "Carné de identidad")],
  }),

  DO: definir({
    codigo: "DO", nombre: "República Dominicana", nombreEn: "Dominican Republic", bandera: "🇩🇴", locale: "es-DO",
    zona: "America/Santo_Domingo",
    telefono: { prefijo: "+1", digitos: 10 },
    capital: { nombre: "Santo Domingo", lat: 18.49, lon: -69.93 },
    documentos: [cedula(11, 11, "00112345678", "Cédula de identidad y electoral")],
  }),

  EC: definir({
    codigo: "EC", nombre: "Ecuador", nombreEn: "Ecuador", bandera: "🇪🇨", locale: "es-EC",
    zona: "America/Guayaquil",
    telefono: { prefijo: "+593", digitos: 9 },
    capital: { nombre: "Quito", lat: -0.18, lon: -78.47 },
    documentos: [cedula(10, 10, "1712345678")],
  }),

  SV: definir({
    codigo: "SV", nombre: "El Salvador", nombreEn: "El Salvador", bandera: "🇸🇻", locale: "es-SV",
    zona: "America/El_Salvador",
    telefono: { prefijo: "+503", digitos: 8 },
    capital: { nombre: "San Salvador", lat: 13.69, lon: -89.22 },
    documentos: [{ value: "DUI", label: "DUI", en: "DUI (national ID)", example: "01234567-8", rule: { kind: "digits", min: 9, max: 9 } }],
  }),

  GT: definir({
    codigo: "GT", nombre: "Guatemala", nombreEn: "Guatemala", bandera: "🇬🇹", locale: "es-GT",
    zona: "America/Guatemala",
    telefono: { prefijo: "+502", digitos: 8 },
    capital: { nombre: "Ciudad de Guatemala", lat: 14.63, lon: -90.51 },
    documentos: [{ value: "DPI", label: "DPI", en: "DPI (national ID)", example: "1234 56789 0101", rule: { kind: "digits", min: 13, max: 13 } }],
  }),

  HN: definir({
    codigo: "HN", nombre: "Honduras", nombreEn: "Honduras", bandera: "🇭🇳", locale: "es-HN",
    zona: "America/Tegucigalpa",
    telefono: { prefijo: "+504", digitos: 8 },
    capital: { nombre: "Tegucigalpa", lat: 14.07, lon: -87.19 },
    documentos: [{ value: "DNI", label: "DNI", en: "DNI (national ID)", example: "0801-1990-12345", rule: { kind: "digits", min: 13, max: 13 } }],
  }),

  MX: definir({
    codigo: "MX", nombre: "México", nombreEn: "Mexico", bandera: "🇲🇽", locale: "es-MX",
    zona: "America/Mexico_City",
    telefono: { prefijo: "+52", digitos: 10 },
    capital: { nombre: "Ciudad de México", lat: 19.43, lon: -99.13 },
    documentos: [
      { value: "CURP", label: "CURP", en: "CURP", example: "GOMC800101HDFNRR09", rule: { kind: "curp" } },
      { value: "INE", label: "INE / Credencial para votar", en: "INE / Voter ID", example: "Clave de elector", exampleEn: "Voter key", rule: { kind: "loose", min: 10, max: 20 } },
    ],
    estudiantes: [
      { value: "student_university", label: "Estudiante de licenciatura", en: "Undergraduate student", group: "students" },
      { value: "student_tsu", label: "Estudiante de TSU / Técnico superior", en: "Higher technician (TSU) student", group: "students" },
      { value: "student_school", label: "Estudiante de preparatoria o bachillerato", en: "High school student", group: "students" },
    ],
    entidades: [
      UNIVERSIDAD,
      { value: "tech", label: "Universidad Tecnológica o Politécnica", en: "Technological or Polytechnic University" },
      { value: "school", label: "Preparatoria o bachillerato", en: "High school" },
      EMPRESA, ORG, NINGUNA,
    ],
  }),

  NI: definir({
    codigo: "NI", nombre: "Nicaragua", nombreEn: "Nicaragua", bandera: "🇳🇮", locale: "es-NI",
    zona: "America/Managua",
    telefono: { prefijo: "+505", digitos: 8 },
    capital: { nombre: "Managua", lat: 12.11, lon: -86.24 },
    // Trece dígitos y una letra final.
    documentos: [{ value: "CI", label: "Cédula de identidad", en: "National ID card", example: "001-010190-0001A", rule: { kind: "loose", min: 14, max: 16 } }],
  }),

  PA: definir({
    codigo: "PA", nombre: "Panamá", nombreEn: "Panama", bandera: "🇵🇦", locale: "es-PA",
    zona: "America/Panama",
    telefono: { prefijo: "+507", digitos: [7, 8] },
    capital: { nombre: "Ciudad de Panamá", lat: 8.98, lon: -79.52 },
    // Lleva guiones y a veces letras («8-123-456», «PE-12-345», «E-8-12345»).
    documentos: [{ value: "CI", label: "Cédula de identidad personal", en: "National ID card", example: "8-123-456", rule: { kind: "loose", min: 5, max: 13 } }],
  }),

  PY: definir({
    codigo: "PY", nombre: "Paraguay", nombreEn: "Paraguay", bandera: "🇵🇾", locale: "es-PY",
    zona: "America/Asuncion",
    telefono: { prefijo: "+595", digitos: 9 },
    capital: { nombre: "Asunción", lat: -25.26, lon: -57.58 },
    documentos: [cedula(5, 8, "1234567")],
  }),

  PE: definir({
    codigo: "PE", nombre: "Perú", nombreEn: "Peru", bandera: "🇵🇪", locale: "es-PE",
    zona: "America/Lima",
    telefono: { prefijo: "+51", digitos: 9 },
    capital: { nombre: "Lima", lat: -12.05, lon: -77.04 },
    documentos: [
      { value: "DNI", label: "DNI", en: "DNI (national ID)", example: "12345678", rule: { kind: "digits", min: 8, max: 8 } },
      { value: "CE", label: "Carné de extranjería", en: "Foreigner ID card", example: "001234567", rule: { kind: "loose", min: 9, max: 12 } },
    ],
    estudiantes: [
      UNIVERSITARIO,
      { value: "student_tech", label: "Estudiante de instituto", en: "Technical institute student", group: "students" },
      { value: "student_school", label: "Estudiante de colegio", en: "School student", group: "students" },
    ],
  }),

  PR: definir({
    codigo: "PR", nombre: "Puerto Rico", nombreEn: "Puerto Rico", bandera: "🇵🇷", locale: "es-PR",
    zona: "America/Puerto_Rico",
    telefono: { prefijo: "+1", digitos: 10 },
    capital: { nombre: "San Juan", lat: 18.47, lon: -66.11 },
    // No hay documento nacional: se usa la licencia o la identificación estatal.
    documentos: [{ value: "ID", label: "Licencia o identificación", en: "Driver's licence or state ID", example: "1234567", rule: { kind: "loose", min: 5, max: 12 } }],
  }),

  UY: definir({
    codigo: "UY", nombre: "Uruguay", nombreEn: "Uruguay", bandera: "🇺🇾", locale: "es-UY",
    zona: "America/Montevideo",
    telefono: { prefijo: "+598", digitos: 8 },
    capital: { nombre: "Montevideo", lat: -34.9, lon: -56.16 },
    documentos: [cedula(7, 8, "1.234.567-2")],
  }),

  VE: definir({
    codigo: "VE", nombre: "Venezuela", nombreEn: "Venezuela", bandera: "🇻🇪", locale: "es-VE",
    zona: "America/Caracas",
    telefono: { prefijo: "+58", digitos: 10 },
    capital: { nombre: "Caracas", lat: 10.48, lon: -66.9 },
    documentos: [cedula(6, 8, "12345678")],
  }),
};

export const ROLES_DE = (pais: Pais): RoleOption[] => [...pais.estudiantes, ...ROLES_COMUNES];
