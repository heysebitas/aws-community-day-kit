import { labelOf } from "@/data/attendee-form";
import { AVAILABILITY, INTEREST_AREAS } from "@/data/volunteer-form";
import { TRACKS } from "@/data/session-tracks";
import { PROFILE_STATUSES, ETIQUETA_ESTADO } from "@/data/speaker-estados";
import { ROLES, ENTIDADES } from "@/config";

/**
 * A quién se le manda un correo.
 *
 * Una audiencia es un dato: uno o más segmentos, cada uno un público (de dónde
 * salen las personas) más unos filtros sobre sus campos. El panel dibuja los
 * filtros desde este catálogo, y lo que se guarda en la campaña es la
 * definición del grupo, no la lista de correos: quien se registre entre que se
 * arma y se manda, entra.
 *
 * Es puro —sin base de datos— para que lo importe el navegador. Quien resuelve
 * las personas es `audiencias-servidor.ts`.
 */


/** De dónde salen las personas. Cada uno es una colección distinta. */
export type Publico = "asistentes" | "speakers" | "voluntarios" | "equipo";

export interface OpcionFiltro {
  valor: string;
  etiqueta: string;
}

export interface Filtro {
  clave: string;
  etiqueta: string;
  /** Para el pie de ayuda del panel, cuando el nombre no basta. */
  explica?: string;
  opciones: OpcionFiltro[];
  /** El trozo de consulta que añade. Recibe sólo valores que están en `opciones` y nunca una lista vacía. */
  aMongo: (valores: string[]) => Record<string, unknown>;
}

export interface DefinicionPublico {
  clave: Publico;
  nombre: string;
  explica: string;
  filtros: Filtro[];
}

// ── Ayudas ───────────────────────────────────────────────────────────────────

const SI_NO: OpcionFiltro[] = [
  { valor: "si", etiqueta: "Sí" },
  { valor: "no", etiqueta: "No" },
];

/**
 * Un filtro de sí/no. Marcar las dos es no filtrar. El «no» usa `$ne` porque
 * un documento puede no tener el campo, y `{campo: false}` lo dejaría fuera.
 */
function booleano(clave: string, campo: string, etiqueta: string, explica?: string): Filtro {
  return {
    clave,
    etiqueta,
    explica,
    opciones: SI_NO,
    aMongo: (v) => {
      if (v.length === 2) return {};
      return v[0] === "si" ? { [campo]: true } : { [campo]: { $ne: true } };
    },
  };
}

/** Un filtro de «está en esta lista» sobre un campo de texto. */
function enLista(clave: string, campo: string, etiqueta: string, opciones: OpcionFiltro[], explica?: string): Filtro {
  return { clave, etiqueta, explica, opciones, aMongo: (v) => ({ [campo]: { $in: v } }) };
}

/** Las dos formas en que puede estar guardada la modalidad de una charla. Se busca por ambas. */
const MODALIDAD_CHARLA: Record<string, string[]> = {
  presencial: ["in-person", "presencial"],
  online: ["online", "virtual"],
};

// ── El catálogo ──────────────────────────────────────────────────────────────

export const PUBLICOS: DefinicionPublico[] = [
  {
    clave: "asistentes",
    nombre: "Asistentes",
    explica: "Quienes se registraron por el formulario público.",
    filtros: [
      enLista("modalidad", "attendance", "Modalidad", [
        { valor: "in-person", etiqueta: "Presencial" },
        { valor: "online", etiqueta: "Online" },
      ]),
      booleano("confirmado", "confirmation.confirmed", "Confirmó asistencia"),
      booleano("checkin", "checkedIn", "Hizo check-in", "Sólo tiene sentido después del evento."),
      enLista("rol", "role", "Rol", ROLES.map((r) => ({ valor: r.value, etiqueta: labelOf(r) }))),
      enLista("entidad", "entityType", "Tipo de entidad",
        ENTIDADES.map((e) => ({ valor: e.value, etiqueta: labelOf(e) }))),
    ],
  },
  {
    clave: "speakers",
    nombre: "Speakers",
    explica: "Quienes postularon una charla, en cualquier estado.",
    filtros: [
      enLista("estado", "status", "Estado de la postulación",
        PROFILE_STATUSES.map((s) => ({ valor: s, etiqueta: ETIQUETA_ESTADO[s] }))),
      {
        clave: "modalidad",
        etiqueta: "Modalidad de la charla",
        opciones: [
          { valor: "presencial", etiqueta: "Presencial" },
          { valor: "online", etiqueta: "Online" },
        ],
        aMongo: (v) => ({ sessionType: { $in: v.flatMap((x) => MODALIDAD_CHARLA[x] ?? [x]) } }),
      },
      enLista("procedencia", "speakerType", "Procedencia", [
        { valor: "local", etiqueta: "Del país" },
        { valor: "international", etiqueta: "Internacional" },
      ]),
      enLista("track", "track", "Track", TRACKS.map((t) => ({ valor: t.value, etiqueta: t.label }))),
      booleano("publicado", "isPublic", "Publicado en el sitio"),
    ],
  },
  {
    clave: "voluntarios",
    nombre: "Voluntarios",
    explica: "Quienes postularon al equipo de voluntariado.",
    filtros: [
      // Un voluntario está aprobado o no lo está: no hay rechazo explícito,
      // así que «pendiente» incluye a quien nunca se revisó.
      booleano("aprobado", "approved", "Aprobado", "«No» incluye a quien aún no se ha revisado."),
      enLista("disponibilidad", "availability", "Disponibilidad",
        AVAILABILITY.map((a) => ({ valor: a.value, etiqueta: labelOf(a) }))),
      enLista("areas", "interestAreas", "Áreas de interés",
        INTEREST_AREAS.map((a) => ({ valor: a.value, etiqueta: labelOf(a) })),
        "Entra quien marcó al menos una de las elegidas."),
    ],
  },
  {
    clave: "equipo",
    nombre: "Equipo interno",
    explica: "Las cuentas del panel: organización y staff.",
    filtros: [
      enLista("rol", "role", "Rol", [
        { valor: "admin", etiqueta: "Administración" },
        { valor: "organizer", etiqueta: "Organización" },
        { valor: "volunteer", etiqueta: "Cuenta de voluntario" },
      ]),
    ],
  },
];

const POR_CLAVE = new Map(PUBLICOS.map((p) => [p.clave, p]));

/** La definición de un público, o `null` si la clave no existe. */
export function publicoDe(clave: string): DefinicionPublico | null {
  return POR_CLAVE.get(clave as Publico) ?? null;
}

// ── El segmento ──────────────────────────────────────────────────────────────

/**
 * Un público y sus filtros, por clave. Una lista vacía o ausente es «sin
 * filtrar». Entre filtros se exige todo (Y); dentro de uno basta un valor (O).
 */
export interface Segmento {
  publico: Publico;
  filtros: Record<string, string[]>;
}

/** La audiencia de un correo: uno o varios segmentos, sumados sin repetir a nadie. */
export type Audiencia = Segmento[];

/**
 * Limpia lo que llega del formulario o de la base. Lo que no está en el
 * catálogo se descarta: un valor inventado en un `$in` no da error, da cero
 * destinatarios.
 */
export function sanearSegmento(bruto: unknown): Segmento | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const def = publicoDe(String(o.publico ?? ""));
  if (!def) return null;

  const filtros: Record<string, string[]> = {};
  const entrada = (o.filtros && typeof o.filtros === "object" ? o.filtros : {}) as Record<string, unknown>;

  for (const f of def.filtros) {
    const valores = entrada[f.clave];
    if (!Array.isArray(valores)) continue;
    const permitidos = new Set(f.opciones.map((x) => x.valor));
    const limpios = [...new Set(valores.filter((v): v is string => typeof v === "string" && permitidos.has(v)))];
    if (limpios.length) filtros[f.clave] = limpios;
  }

  return { publico: def.clave, filtros };
}

/** Sanea una audiencia completa y descarta los segmentos que no se sostienen. */
export function sanearAudiencia(bruto: unknown): Audiencia {
  if (!Array.isArray(bruto)) return [];
  // Con tope, para que un cuerpo enorme no dispare una consulta por entrada.
  return bruto.slice(0, 20).map(sanearSegmento).filter((s): s is Segmento => s !== null);
}

/** La consulta de un segmento. Sin filtros es `{}`: todo el público. */
export function consultaDe(segmento: Segmento): Record<string, unknown> {
  const def = publicoDe(segmento.publico);
  if (!def) return {};

  let consulta: Record<string, unknown> = {};
  for (const f of def.filtros) {
    // `filtros` puede faltar en documentos guardados antes de `minimize: false`.
    const valores = segmento.filtros?.[f.clave];
    if (!valores?.length) continue;
    consulta = { ...consulta, ...f.aMongo(valores) };
  }
  return consulta;
}

/** El segmento en una frase, para leer a quién va antes de enviar. */
export function resumenSegmento(segmento: Segmento): string {
  const def = publicoDe(segmento.publico);
  if (!def) return "público desconocido";

  const partes: string[] = [];
  for (const f of def.filtros) {
    const valores = segmento.filtros?.[f.clave];
    if (!valores?.length) continue;
    const textos = valores.map((v) => f.opciones.find((o) => o.valor === v)?.etiqueta ?? v);
    partes.push(`${f.etiqueta.toLowerCase()}: ${textos.join(" o ")}`);
  }

  return partes.length ? `${def.nombre} — ${partes.join(" · ")}` : `${def.nombre} (todos)`;
}

/** El resumen de una audiencia entera. */
export function resumenAudiencia(audiencia: Audiencia): string {
  if (!audiencia.length) return "sin audiencia";
  return audiencia.map(resumenSegmento).join("  +  ");
}
