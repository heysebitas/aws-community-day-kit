import { DOMINIO, EVENTO, IDIOMA_BASE, PAIS, SITIO } from "@/config";
import { fechaConDia, fechaCorta, fechaLarga, fechaMedia, hora, hora24, zonaDe } from "@/config/fechas";

/**
 * Los datos del evento que puede usar cualquier correo, como `{evento}` o
 * `{fecha}`. Son las variables del grupo «El evento» del editor.
 */
export function valoresDelEvento(): Record<string, string> {
  const i = IDIOMA_BASE;
  const e = EVENTO;
  const dia = fechaConDia(e.inicio, i);
  // La encuesta del programa pide la fecha en formato de Estados Unidos, mes primero.
  const [d, m, a] = fechaCorta(e.inicio).split(".");

  return {
    evento: e.nombreCompleto,
    fecha: fechaLarga(e.inicio, i),
    fechaDia: `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${e.anio}`,
    fechaCorta: fechaCorta(e.inicio),
    horaPuertas: `${hora(e.inicio, i)} (${zonaDe(e.inicio, i)})`,
    sede: e.sede.nombre,
    direccion: `${e.sede.direccion}, ${e.sede.localidad}`,
    ciudad: e.ciudad,
    pais: PAIS.nombre,
    anioSiguiente: String(e.anio + 1),
    sitio: SITIO,
    dominio: DOMINIO,
    cfpCierre: `${fechaMedia(e.cfpCierre, i)}, ${hora24(e.cfpCierre)} (${zonaDe(e.cfpCierre, i)})`,
    cfpSlides: fechaMedia(e.cfpSlides, i),
    encuestaEvento: e.detalles.encuesta?.evento ?? "",
    encuestaFecha: `${m}/${d}/${a}`,
    encuestaAnfitrion: e.detalles.encuesta?.anfitrion ?? "",
  };
}
