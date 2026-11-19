import { DOMINIO, EVENTO, PAIS } from "@/config";
import { coordenadas, fechaConDia, fechaCorta, fechaLarga, fechaMedia, hora, hora24, zonaDe } from "@/config/fechas";
import type { Idioma, Traducible } from "@/config/tipos";

/**
 * Los datos de la edición que aparecen dentro de los textos.
 *
 * En `src/messages/*.json` se escriben como `[[ciudad]]` o `[[fecha]]` y se
 * sustituyen al cargar los mensajes, así que ningún texto lleva escrito el
 * país, la fecha o la sede. Los corchetes dobles son para no chocar con las
 * variables `{así}` de next-intl.
 */

const en = (t: Traducible, idioma: Idioma) =>
  idioma === "en" ? t.en : idioma === "pt" ? t.pt ?? t.label : t.label;

export function tokensDe(idioma: Idioma): Record<string, string> {
  const e = EVENTO;
  const pais = idioma === "en" ? PAIS.nombreEn : PAIS.nombre;
  const edicion = e.edicion === PAIS.nombre ? pais : e.edicion;

  return {
    evento: `${e.nombre} ${edicion} ${e.anio}`,
    nombre: e.nombre,
    siglas: e.siglas,
    edicion,
    anio: String(e.anio),
    anio_siguiente: String(e.anio + 1),
    ciudad: e.ciudad,
    pais,
    organiza: e.organiza,
    dominio: DOMINIO,
    cupos: String(e.cupos),
    prefijo_tel: PAIS.telefono.prefijo,

    sede: e.sede.nombre,
    direccion: e.sede.direccion,
    localidad: e.sede.localidad,
    coordenadas: coordenadas(idioma),
    como_llegar: en(e.detalles.comoLlegar, idioma),

    fecha: fechaLarga(e.inicio, idioma),
    fecha_dia: fechaConDia(e.inicio, idioma),
    fecha_corta: fechaCorta(e.inicio),
    hora: hora(e.inicio, idioma),
    zona: zonaDe(e.inicio, idioma),

    cfp_cierre: `${fechaMedia(e.cfpCierre, idioma)} · ${hora24(e.cfpCierre)} ${zonaDe(e.cfpCierre, idioma)}`,
    cfp_cierre_largo: `${fechaLarga(e.cfpCierre, idioma)}, ${hora24(e.cfpCierre)} ${zonaDe(e.cfpCierre, idioma)}`,
    cfp_revision: en(e.cfp.hitos.revision, idioma),
    cfp_seleccion: en(e.cfp.hitos.seleccion, idioma),
    cfp_slides: fechaMedia(e.cfpSlides, idioma),

    ley_datos: en(PAIS.datos.ley, idioma),
    autoridad_datos: en(PAIS.datos.autoridad, idioma),
    legal_actualizado: fechaLarga(`${e.detalles.legalActualizado}T12:00:00Z`, idioma),

  };
}

const TOKEN = /\[\[([a-z_]+)\]\]/g;

/** Sustituye los tokens en todo el árbol de mensajes. Uno desconocido se deja a la vista. */
export function resolver<T>(mensajes: T, tokens: Record<string, string>): T {
  if (typeof mensajes === "string") {
    return mensajes.replace(TOKEN, (todo, clave: string) => tokens[clave] ?? todo) as T;
  }
  if (Array.isArray(mensajes)) return mensajes.map((m) => resolver(m, tokens)) as T;
  if (mensajes && typeof mensajes === "object") {
    return Object.fromEntries(
      Object.entries(mensajes).map(([k, v]) => [k, resolver(v, tokens)]),
    ) as T;
  }
  return mensajes;
}
