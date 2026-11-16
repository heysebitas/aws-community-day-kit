/** Los tipos de la configuración de una edición. El archivo que se edita es `evento/config.ts`. */

export type Idioma = "es" | "en" | "pt";

/** Texto con sus traducciones. El español es obligatorio: es el idioma del panel y de los exports. */
export type Traducible = { label: string; en: string; pt?: string };

export type CodigoPais =
  | "AR" | "BO" | "BR" | "CL" | "CO" | "CR" | "CU" | "DO" | "EC" | "SV"
  | "GT" | "HN" | "MX" | "NI" | "PA" | "PY" | "PE" | "PR" | "UY" | "VE";

/** Cómo se valida el número de un documento. */
export type DocRule =
  | { kind: "digits"; min: number; max: number }
  /** RUN/RUT chileno, con dígito verificador. */
  | { kind: "run" }
  /** CPF brasileño, con sus dos dígitos verificadores. */
  | { kind: "cpf" }
  /** CURP mexicana: 18 caracteres con estructura fija. */
  | { kind: "curp" }
  /** Alfanumérico sin estructura: pasaportes y documentos que no validamos a fondo. */
  | { kind: "loose"; min: number; max: number };

export type DocType = Traducible & {
  /** Se guarda en la base: no cambiarlo sin migrar los registros. */
  value: string;
  example: string;
  exampleEn?: string;
  rule: DocRule;
};

export type RoleGroup = "students" | "teaching" | "work" | "other";
export type RoleOption = Traducible & { value: string; group: RoleGroup };
export type EntityType = Traducible & { value: string };

export type Pais = {
  codigo: CodigoPais;
  nombre: string;
  nombreEn: string;
  bandera: string;
  /** Para `Intl` y para `lang`. */
  locale: string;
  /** Zona horaria de la capital; la edición puede fijar otra. */
  zona: string;
  telefono: { prefijo: string; digitos: number | [number, number] };
  /** Donde se centra el globo si la sede no trae coordenadas. */
  capital: { nombre: string; lat: number; lon: number };
  /** Documentos nacionales. Pasaporte y documento extranjero se añaden solos. */
  documentos: DocType[];
  /** Cómo se llaman acá los niveles de estudio. Los roles comunes se añaden solos. */
  estudiantes: RoleOption[];
  entidades: EntityType[];
  /** La ley de protección de datos y ante quién se reclama, tal como se citan en la política de privacidad. */
  datos: { ley: Traducible; autoridad: Traducible };
};

/** Los cuatro colores de un tema. El resto de la paleta es neutra y no cambia. */
export type Tema = {
  /** Fondo de los bloques claros y acento sobre negro. Siempre lleva texto oscuro encima. */
  acento: string;
  claro: string;
  fuerte: string;
  /** Acento para usar encima de `acento`: mismo tono, mucho más oscuro. */
  profundo: string;
};

export type NombreTema =
  | "lavanda" | "platano" | "naranja" | "menta" | "cielo" | "coral" | "rosa" | "lima";

/** Fecha y hora locales del evento, sin zona: `"2027-10-23T08:30"`. */
export type FechaLocal = `${number}-${number}-${number}T${number}:${number}`;

export type ConfigEvento = {
  /** Nombre del programa, sin país ni año: «AWS Student Community Day». */
  nombre: string;
  /** Cómo se abrevia en cintas, correos y remitentes: «SCD». */
  siglas: string;
  /** Lo que va después del nombre: el país o la ciudad. «Colombia», «Bogotá». */
  edicion: string;
  anio: number;
  pais: CodigoPais;
  ciudad: string;
  /** El logotipo: el logo del programa y el nombre partido en renglones a su lado. */
  marca: {
    logo: string;
    /** El mismo logo en PNG, para los PDF (pases, cartas, certificados), que no dibujan SVG. */
    logoPng?: string;
    alt: string;
    lineas: string[];
    /** La ilustración o mascota de la edición, si la hay (PNG con fondo transparente). Sale en la portada, el pasaporte y las tarjetas de speaker. */
    mascota?: string;
  };
  /** Quién firma el evento en metadatos y correos. */
  organiza: string;
  /** Dominio público. `NEXT_PUBLIC_APP_URL` manda si está definida. */
  sitio: string;

  fecha: {
    /** Apertura de puertas: es a lo que cuenta el reloj. */
    inicio: FechaLocal;
    fin: FechaLocal;
    /** Por omisión, la de la capital del país. */
    zona?: string;
    /** En `false` la portada dice «próximamente» en vez de la fecha. */
    confirmada: boolean;
    /** Hasta cuándo se puede confirmar asistencia. Por omisión, dos horas antes del inicio. */
    confirmacionHasta?: FechaLocal;
  };

  sede: {
    nombre: string;
    direccion: string;
    /** Barrio o comuna y ciudad, para correos y datos estructurados. */
    localidad: string;
    coordenadas?: { lat: number; lon: number };
    /** Enlace de «cómo llegar». */
    mapa: string;
    /** Silueta 3D de la sección de sede. `"auto"` genera una a partir del nombre de la ciudad. */
    silueta?: "auto" | "santiago" | "ninguna";
    /** Pie de la silueta: «gran torre santiago · los andes». */
    siluetaPie?: string;
  };

  /** Aforo que se anuncia. */
  cupos: number;
  modalidad: { presencial: boolean; online: boolean };

  /** Un tema de `src/config/temas.ts`, un color (`"#12AB34"`) del que derivar los demás, o los cuatro a mano. */
  tema: NombreTema | `#${string}` | Tema;

  /** El primero es el idioma por omisión y sale sin prefijo en la URL. Hoy hay textos en `es` y `en`. */
  idiomas: [Idioma, ...Idioma[]];

  /** Si los rastreadores de IA (GPTBot, ClaudeBot…) pueden leer el sitio. */
  rastreoIA: boolean;

  redes: Partial<Record<"instagram" | "x" | "linkedin" | "discord" | "youtube" | "tiktok" | "whatsapp", string>>;

  /** Convocatoria de speakers. */
  cfp: {
    cierre: FechaLocal;
    /** Entrega de diapositivas. */
    slides: FechaLocal;
    /** Si se aceptan charlas para el track online. */
    online: boolean;
    /** Rangos de fechas del calendario del CFP, tal como se muestran. */
    hitos: { revision: Traducible; seleccion: Traducible };
  };

  /** Datos sueltos que aparecen en textos y que cambian con cada edición. */
  detalles: {
    /** Para el FAQ: cómo se llega a la sede. */
    comoLlegar: Traducible;
    /** Cuántos speakers se anuncian en la portada («20+»). Sin esto la cifra no sale. */
    speakers?: number;
    /** Quién otorga el certificado de voluntariado. Por omisión, el equipo organizador. */
    certificado?: { nombre: string; cargo: string };
    /** Datos prácticos para speakers que viajan desde otro país. Van en su carta de aceptación. */
    consejosViaje?: string[];
    /**
     * La encuesta final del programa. El formulario lo comparten todos los
     * eventos, así que pide identificar el tuyo: `evento` y `anfitrion` son las
     * respuestas exactas que tienen que dar los asistentes. Sin esto no se
     * siembra el correo de la encuesta. La URL se puede cambiar desde el panel.
     */
    encuesta?: { url: string; evento: string; anfitrion: string };
    /** Fecha de la última revisión de la política de privacidad y el código de conducta: `2027-01-15`. */
    legalActualizado: `${number}-${number}-${number}`;
  };

  /** Crédito del pie de página. */
  hechoPor?: { nombre: string; url?: string };
};
