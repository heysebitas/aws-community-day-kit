import { EVENTO, IDIOMAS, IDIOMA_BASE, PAIS, SITIO } from "@/config";
import { fechaConDia, hora, zonaDe } from "@/config/fechas";
import type { Idioma } from "@/config/tipos";
import { labelOf } from "@/data/attendee-form";
import { resolver, tokensDe } from "@/i18n/tokens";
import { getAgendaEvents } from "@/lib/data/agenda";
import { getPublicEventConfig } from "@/lib/data/event-config";
import { getActiveFaqs } from "@/lib/data/faq";
import { getPublicSpeakers } from "@/lib/data/speakers";
import { localePath } from "@/lib/utils";
import { comunidades } from "@evento/comunidades";
import { equipo } from "@evento/equipo";
import { keynotes } from "@evento/keynotes";
import { patrocinadores } from "@evento/patrocinadores";
import { tracks } from "@evento/tracks";

/**
 * El evento contado para una máquina.
 *
 * Un asistente de IA que tenga que responder «¿cuándo es?» o «¿cómo me
 * registro?» no debería interpretar una portada llena de animaciones. Acá
 * están los mismos datos en texto plano: los sirven `/llms.txt` (el índice,
 * según llmstxt.org), `/llms-full.txt` (todo en un documento) y `/api/evento`
 * (lo mismo en JSON).
 *
 * Sólo sale lo que ya es público en el sitio. Nada de asistentes, correos ni
 * datos del panel.
 */

export function idiomaPedido(valor: string | null): Idioma {
  return (IDIOMAS as readonly string[]).includes(valor ?? "") ? (valor as Idioma) : IDIOMA_BASE;
}

async function mensajes(idioma: Idioma) {
  const crudos = (await import(`../messages/${idioma}.json`)).default;
  return resolver(crudos, tokensDe(idioma)) as Record<string, Record<string, string>>;
}

const url = (idioma: Idioma, ruta = "") => `${SITIO}${localePath(idioma, ruta)}`.replace(/\/$/, "") || SITIO;

/** Los datos públicos del evento, juntos. */
export async function datosDelEvento(idioma: Idioma) {
  const [m, estado, faqs, agenda, speakers] = await Promise.all([
    mensajes(idioma),
    getPublicEventConfig().catch(() => null),
    getActiveFaqs().catch(() => []),
    getAgendaEvents().catch(() => []),
    getPublicSpeakers().catch(() => []),
  ]);
  const en = idioma === "en";
  const { presencial, online } = EVENTO.modalidad;

  return {
    nombre: tokensDe(idioma).evento,
    descripcion: m.Metadata.description,
    organiza: EVENTO.organiza,
    gratuito: true,
    idiomas: IDIOMAS,
    fecha: {
      inicio: EVENTO.inicio,
      fin: EVENTO.fin,
      zona: EVENTO.zona,
      texto: `${fechaConDia(EVENTO.inicio, idioma)} ${EVENTO.anio}, ${hora(EVENTO.inicio, idioma)} (${zonaDe(EVENTO.inicio, idioma)})`,
      confirmada: EVENTO.fecha.confirmada,
    },
    modalidad: en
      ? (presencial && online ? "in person and online" : online ? "online" : "in person")
      : (presencial && online ? "presencial y en línea" : online ? "en línea" : "presencial"),
    sede: presencial
      ? {
          nombre: EVENTO.sede.nombre,
          direccion: EVENTO.sede.direccion,
          localidad: EVENTO.sede.localidad,
          pais: en ? PAIS.nombreEn : PAIS.nombre,
          coordenadas: EVENTO.coordenadas,
          mapa: EVENTO.sede.mapa,
        }
      : null,
    cupos: EVENTO.cupos,
    registro: { abierto: !!estado?.attendeeOpen, url: url(idioma, "/registro") },
    convocatoriaSpeakers: { cierre: EVENTO.cfpCierre, cierreTexto: tokensDe(idioma).cfp_cierre_largo, abierta: Date.now() <= new Date(EVENTO.cfpCierre).getTime(), url: url(idioma, "/speakers") },
    voluntariado: { abierto: !!estado?.volunteerOpen, url: url(idioma, "/voluntarios") },
    transmision: estado?.trackVirtualUrl || null,
    tracks: tracks.map((t) => ({ id: t.id, titulo: labelOf(t.titulo, idioma), nivel: labelOf(t.nivel, idioma), temas: t.temas })),
    keynotes: keynotes.map((k) => ({
      nombre: `${k.nombre} ${k.apellido}`,
      cargo: [k.cargo, k.empresa].filter(Boolean).join(", "),
      charla: k.tituloCharla ?? null,
    })),
    speakers: speakers.map((s) => ({
      nombre: s.name,
      cargo: s.tagline || s.role || "",
      charla: s.talkTitle ?? "",
      track: tracks.find((t) => t.id === s.track)?.titulo.label ?? null,
      perfil: url(idioma, `/speakers/${s.slug}`),
    })),
    agenda: agenda.map((a) => ({
      inicio: a.startTime,
      fin: a.endTime,
      titulo: a.title,
      speaker: a.speaker || null,
      sala: a.room || null,
      track: tracks.find((t) => t.id === a.track)?.titulo.label ?? null,
    })),
    preguntasFrecuentes: faqs.length
      ? faqs.map((f) => ({ pregunta: en ? f.questionEn : f.questionEs, respuesta: en ? f.answerEn : f.answerEs }))
      : Array.from({ length: 10 }, (_, i) => ({ pregunta: m.FAQ[`q${i + 1}`], respuesta: m.FAQ[`a${i + 1}`] })),
    equipo: equipo.map((o) => ({ nombre: o.nombre, rol: o.rol })),
    patrocinadores: patrocinadores.map((p) => ({ nombre: p.nombre, url: p.url })),
    comunidades: comunidades.map((c) => c.nombre),
    enlaces: {
      sitio: url(idioma),
      directorio: url(idioma, "/directorio"),
      codigoDeConducta: url(idioma, "/codigo-conducta"),
      privacidad: url(idioma, "/privacidad"),
      redes: Object.fromEntries(Object.entries(EVENTO.redes).filter(([, v]) => !!v)),
    },
  };
}

type Datos = Awaited<ReturnType<typeof datosDelEvento>>;

const T = {
  es: {
    cuando: "Cuándo", donde: "Dónde", modalidad: "Modalidad", costo: "Costo", gratis: "Gratuito", cupos: "Cupos",
    organiza: "Organiza", registro: "Registro", abierto: "abierto", cerrado: "cerrado",
    cfp: "Convocatoria de speakers", cierra: "cierra el", voluntariado: "Voluntariado", transmision: "Transmisión",
    tracks: "Tracks", keynotes: "Keynotes", speakers: "Speakers", agenda: "Agenda", faq: "Preguntas frecuentes",
    equipo: "Equipo organizador", patrocinadores: "Patrocinadores", comunidades: "Comunidades aliadas",
    paginas: "Páginas", todo: "Todo el contenido en un solo documento", json: "Los mismos datos en JSON",
    sitio: "Portada", directorio: "Directorio de speakers y agenda", coc: "Código de conducta", privacidad: "Política de privacidad",
    porConfirmar: "por confirmar", sala: "sala",
  },
  en: {
    cuando: "When", donde: "Where", modalidad: "Format", costo: "Cost", gratis: "Free", cupos: "Capacity",
    organiza: "Organized by", registro: "Registration", abierto: "open", cerrado: "closed",
    cfp: "Call for speakers", cierra: "closes on", voluntariado: "Volunteering", transmision: "Live stream",
    tracks: "Tracks", keynotes: "Keynotes", speakers: "Speakers", agenda: "Schedule", faq: "Frequently asked questions",
    equipo: "Organizing team", patrocinadores: "Sponsors", comunidades: "Partner communities",
    paginas: "Pages", todo: "All the content in a single document", json: "The same data as JSON",
    sitio: "Home", directorio: "Speaker directory and schedule", coc: "Code of conduct", privacidad: "Privacy policy",
    porConfirmar: "to be confirmed", sala: "room",
  },
} as const;

const textos = (idioma: Idioma) => T[idioma === "en" ? "en" : "es"];

function ficha(d: Datos, idioma: Idioma): string[] {
  const t = textos(idioma);
  return [
    `- **${t.cuando}:** ${d.fecha.confirmada ? d.fecha.texto : t.porConfirmar}`,
    d.sede ? `- **${t.donde}:** ${d.sede.nombre}, ${d.sede.direccion}, ${d.sede.localidad}, ${d.sede.pais} (${d.sede.mapa})` : "",
    `- **${t.modalidad}:** ${d.modalidad}`,
    `- **${t.costo}:** ${t.gratis}`,
    `- **${t.cupos}:** ${d.cupos}`,
    `- **${t.organiza}:** ${d.organiza}`,
    `- **${t.registro}:** ${d.registro.abierto ? t.abierto : t.cerrado} — ${d.registro.url}`,
    `- **${t.cfp}:** ${d.convocatoriaSpeakers.abierta ? t.abierto : t.cerrado}, ${t.cierra} ${d.convocatoriaSpeakers.cierreTexto} — ${d.convocatoriaSpeakers.url}`,
    d.voluntariado ? `- **${t.voluntariado}:** ${d.voluntariado.abierto ? t.abierto : t.cerrado} — ${d.voluntariado.url}` : "",
    d.transmision ? `- **${t.transmision}:** ${d.transmision}` : "",
  ].filter(Boolean);
}

/** `/llms.txt`: qué es esto y dónde está cada cosa. */
export async function llmsTxt(idioma: Idioma): Promise<string> {
  const d = await datosDelEvento(idioma);
  const t = textos(idioma);
  const sufijo = idioma === IDIOMA_BASE ? "" : `?lang=${idioma}`;

  return [
    `# ${d.nombre}`,
    "",
    `> ${d.descripcion}`,
    "",
    ...ficha(d, idioma),
    "",
    `## ${t.paginas}`,
    "",
    `- [${t.todo}](${SITIO}/llms-full.txt${sufijo})`,
    `- [${t.json}](${SITIO}/api/evento${sufijo})`,
    `- [${t.sitio}](${d.enlaces.sitio})`,
    `- [${t.registro}](${d.registro.url})`,
    `- [${t.cfp}](${d.convocatoriaSpeakers.url})`,
    `- [${t.directorio}](${d.enlaces.directorio})`,
    `- [${t.coc}](${d.enlaces.codigoDeConducta})`,
    `- [${t.privacidad}](${d.enlaces.privacidad})`,
    "",
  ].join("\n");
}

/** `/llms-full.txt`: todo lo público del evento en un documento Markdown. */
export async function llmsFull(idioma: Idioma): Promise<string> {
  const d = await datosDelEvento(idioma);
  const t = textos(idioma);
  const seccion = (titulo: string, lineas: string[]) => (lineas.length ? [`## ${titulo}`, "", ...lineas, ""] : []);

  return [
    `# ${d.nombre}`,
    "",
    `> ${d.descripcion}`,
    "",
    ...ficha(d, idioma),
    "",
    ...seccion(t.tracks, d.tracks.map((x) => `- **${x.titulo}** (${x.nivel}): ${x.temas.join(", ")}`)),
    ...seccion(t.keynotes, d.keynotes.map((k) => `- **${k.nombre}**${k.cargo ? ` — ${k.cargo}` : ""}${k.charla ? `. «${k.charla}»` : ""}`)),
    ...seccion(t.speakers, d.speakers.map((s) => `- **${s.nombre}**${s.cargo ? ` — ${s.cargo}` : ""}${s.charla ? `. «${s.charla}»` : ""}${s.track ? ` [${s.track}]` : ""} (${s.perfil})`)),
    ...seccion(t.agenda, d.agenda.map((a) => `- ${a.inicio}–${a.fin} · ${a.titulo}${a.speaker ? ` — ${a.speaker}` : ""}${a.sala ? ` (${t.sala}: ${a.sala})` : ""}`)),
    ...seccion(t.faq, d.preguntasFrecuentes.flatMap((f) => [`### ${f.pregunta}`, "", f.respuesta, ""])),
    ...seccion(t.equipo, d.equipo.map((o) => `- ${o.nombre} — ${o.rol}`)),
    ...seccion(t.patrocinadores, d.patrocinadores.map((p) => `- [${p.nombre}](${p.url})`)),
    ...seccion(t.comunidades, d.comunidades.map((c) => `- ${c}`)),
  ].join("\n");
}
