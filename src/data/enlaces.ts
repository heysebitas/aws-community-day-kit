import { EVENTO } from "@/config";

/**
 * Los enlaces que van dentro de los correos: grupos de WhatsApp, la plantilla
 * de diapositivas, el mapa de la sede.
 */

export interface DefinicionEnlace {
  /** Con la que se guarda. No cambiarla sin migrar. */
  clave: string;
  etiqueta: string;
  explica: string;
  /**
   * La variable con la que se escribe en un correo, si tiene una. Varios
   * enlaces pueden compartirla: cuál toca lo decide a quién se le escribe.
   */
  variable?: string;
  ejemplo?: string;
  grupo: "WhatsApp" | "Material";
}

// La transmisión, las fotos y las grabaciones no están acá: son de la portada y
// viven en la configuración del evento. Sus variables de correo se leen de allí,
// para que la web y el correo no puedan decir cosas distintas.
export const ENLACES: DefinicionEnlace[] = [
  {
    clave: "grupoSpeakers",
    etiqueta: "Grupo de speakers",
    explica: "Va en el correo de aprobación de speakers presenciales.",
    variable: "grupoWhatsapp",
    ejemplo: "https://chat.whatsapp.com/…",
    grupo: "WhatsApp",
  },
  {
    clave: "grupoSpeakersOnline",
    etiqueta: "Grupo de speakers online",
    explica: "Si está vacío, los del track online entran al grupo general.",
    ejemplo: "https://chat.whatsapp.com/…",
    grupo: "WhatsApp",
  },
  {
    clave: "grupoVoluntarios",
    etiqueta: "Grupo de voluntarios",
    explica: "Va en el correo de aprobación de voluntarios.",
    ejemplo: "https://chat.whatsapp.com/…",
    grupo: "WhatsApp",
  },
  {
    clave: "plantillaDiapositivas",
    etiqueta: "Plantilla de diapositivas",
    explica: "La plantilla oficial que se les manda a los speakers aceptados.",
    variable: "plantillaDiapositivas",
    grupo: "Material",
  },
  {
    clave: "subirPresentacion",
    etiqueta: "Carpeta para subir presentaciones",
    explica: "Dónde suben su presentación los speakers.",
    variable: "subirPresentacion",
    grupo: "Material",
  },
  {
    clave: "encuesta",
    etiqueta: "Encuesta final",
    explica: "A dónde lleva el enlace con seguimiento del correo de encuesta: la URL del formulario externo.",
    ejemplo: "https://…",
    grupo: "Material",
  },
  {
    clave: "comoLlegar",
    etiqueta: "Cómo llegar",
    explica: "El mapa de la sede. Va en los correos de registro presencial.",
    variable: "comoLlegar",
    ejemplo: "https://maps.app.goo.gl/…",
    grupo: "Material",
  },
];

export const CLAVES_ENLACE = ENLACES.map((e) => e.clave);

const POR_CLAVE = new Map(ENLACES.map((e) => [e.clave, e]));

export function enlaceDe(clave: string): DefinicionEnlace | null {
  return POR_CLAVE.get(clave) ?? null;
}

/** Los grupos, en el orden en que salen en el formulario. */
export const GRUPOS_ENLACE = [...new Set(ENLACES.map((e) => e.grupo))];

/**
 * Deja en forma lo que llega del formulario: descarta claves que no estén en
 * el catálogo y cualquier cosa que no sea un enlace web. Un vacío se guarda
 * como vacío: es la forma de quitar el botón que lo usa.
 */
export function sanearEnlaces(bruto: unknown): Record<string, string> {
  const salida: Record<string, string> = {};
  if (!bruto || typeof bruto !== "object") return salida;
  const o = bruto as Record<string, unknown>;

  for (const e of ENLACES) {
    const v = o[e.clave];
    if (typeof v !== "string") continue;
    const limpio = v.trim().slice(0, 500);
    // Sólo http(s): un `javascript:` guardado acá acabaría en el `href` de un botón.
    salida[e.clave] = !limpio || /^https?:\/\//i.test(limpio) ? limpio : "";
  }
  return salida;
}

/** Las variables de correo que salen de los enlaces. Las vacías se omiten, para poder esconder su botón. */
export function variablesDeEnlaces(valores: Record<string, string>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const e of ENLACES) {
    if (!e.variable) continue;
    const v = valores[e.clave]?.trim();
    if (v) salida[e.variable] = v;
  }
  return salida;
}

/** Los valores de partida, que salen de `evento/config.ts`. */
export const SEMILLA_ENLACES: Record<string, string> = {
  comoLlegar: EVENTO.sede.mapa,
  encuesta: EVENTO.detalles.encuesta?.url ?? "",
};
