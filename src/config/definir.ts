import { PAISES } from "./paises";
import { resolverTema } from "./temas";
import { instante } from "./tiempo";
import type { ConfigEvento } from "./tipos";

/** Los idiomas que tienen su archivo en `src/messages/`. */
const IDIOMAS_CON_TEXTOS: string[] = ["es", "en"];

/**
 * Comprueba la configuración al arrancar.
 *
 * Un dato mal escrito acá no rompe nada de inmediato: sale un reloj que cuenta
 * a otra hora o un formulario sin documentos. Es más barato fallar en el
 * arranque, con el nombre del campo, que descubrirlo el día del evento.
 */
export function definirEvento(config: ConfigEvento): ConfigEvento {
  const error = (campo: string, motivo: string): never => {
    throw new Error(`evento/config.ts → ${campo}: ${motivo}`);
  };

  if (config.tipo !== "scd" && config.tipo !== "cd") error("tipo", "tiene que ser \"scd\" (AWS Student Community Day) o \"cd\" (otro Community Day).");

  const pais = PAISES[config.pais];
  if (!pais) error("pais", `«${config.pais}» no está en el catálogo. Opciones: ${Object.keys(PAISES).join(", ")}.`);

  const zona = config.fecha.zona ?? pais.zona;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zona });
  } catch {
    error("fecha.zona", `«${zona}» no es una zona horaria IANA (ej. America/Bogota).`);
  }

  const inicio = instante(config.fecha.inicio, zona);
  const fin = instante(config.fecha.fin, zona);
  if (fin <= inicio) error("fecha.fin", "tiene que ser posterior a fecha.inicio.");

  if (instante(config.cfp.cierre, zona) >= inicio) error("cfp.cierre", "la convocatoria tiene que cerrar antes del evento.");
  if (!config.idiomas.length) error("idiomas", "hace falta al menos uno.");
  if (new Set(config.idiomas).size !== config.idiomas.length) error("idiomas", "hay uno repetido.");
  for (const i of config.idiomas) {
    if (!IDIOMAS_CON_TEXTOS.includes(i)) error("idiomas", `todavía no hay textos en «${i}». Disponibles: ${IDIOMAS_CON_TEXTOS.join(", ")}.`);
  }
  if (!config.modalidad.presencial && !config.modalidad.online) error("modalidad", "al menos una de las dos tiene que estar en true.");
  if (!Number.isInteger(config.cupos) || config.cupos < 1) error("cupos", "tiene que ser un entero positivo.");

  try {
    new URL(config.sitio);
  } catch {
    error("sitio", `«${config.sitio}» no es una URL. Lleva el protocolo: https://tu-dominio.`);
  }

  resolverTema(config.tema);

  return config;
}
