import config from "@evento/config";
import { PAISES, ROLES_DE } from "./paises";
import { resolverTema } from "./temas";
import { instante } from "./tiempo";

/**
 * La edición ya resuelta: lo que el resto del código importa.
 *
 * `evento/config.ts` guarda sólo lo que alguien decide. Lo que se deduce de
 * eso —instantes en UTC, zona, nombre completo, dominio— se calcula acá una
 * vez, para que no haya dos sitios donde escribir el mismo dato.
 */

export const PAIS = PAISES[config.pais];
export const TEMA = resolverTema(config.tema);

/** Documentos, roles y entidades del país del evento, ya con las opciones comunes. */
export const DOCUMENTOS = PAIS.documentos;
export const ROLES = ROLES_DE(PAIS);
export const ENTIDADES = PAIS.entidades;

export const IDIOMAS = config.idiomas;
export const IDIOMA_BASE = config.idiomas[0];

/** URL pública sin barra final. La variable de entorno permite un dominio por despliegue. */
export const SITIO = (process.env.NEXT_PUBLIC_APP_URL || config.sitio).replace(/\/+$/, "");
export const DOMINIO = new URL(SITIO).host;

/** Para nombres de archivo: «scd-chile-2026». */
export const SLUG = `${config.siglas}-${config.edicion}-${config.anio}`
  .toLowerCase()
  .normalize("NFD")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const zona = config.fecha.zona ?? PAIS.zona;
const inicio = instante(config.fecha.inicio, zona);
const DOS_HORAS = 2 * 60 * 60 * 1000;

export const EVENTO = {
  ...config,
  /** «AWS Student Community Day Colombia 2027». */
  nombreCompleto: `${config.nombre} ${config.edicion} ${config.anio}`,
  /** «SCD Colombia 2027». */
  nombreCorto: `${config.siglas} ${config.edicion} ${config.anio}`,
  zona,
  inicio: inicio.toISOString(),
  fin: instante(config.fecha.fin, zona).toISOString(),
  confirmacionHasta: (config.fecha.confirmacionHasta
    ? instante(config.fecha.confirmacionHasta, zona)
    : new Date(inicio.getTime() - DOS_HORAS)
  ).toISOString(),
  cfpCierre: instante(config.cfp.cierre, zona).toISOString(),
  cfpSlides: instante(config.cfp.slides, zona).toISOString(),
  coordenadas: config.sede.coordenadas ?? { lat: PAIS.capital.lat, lon: PAIS.capital.lon },
} as const;

export type { ConfigEvento, Idioma, Pais, Tema, Traducible } from "./tipos";
