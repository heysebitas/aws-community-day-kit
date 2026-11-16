import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { EVENTO, TEMA } from "@/config";

/** Composición del GIF del reloj; la ruta sólo lo sirve y lo cachea. */

const EVENT_DATE = new Date(EVENTO.inicio);

const W = 560;
const H = 128;
const FRAMES = 60; // uno por segundo

const FONDO = "#0C0D10";
const CAJA = "#161820";
const TINTA = "#F9FAFB";
const MORADO = TEMA.acento;

/** Dónde empieza cada una de las cuatro cajas. */
const CAJAS = [10, 150, 290, 430];
const CAJA_W = 120;
const ETIQUETAS = ["DÍAS", "HORAS", "MINUTOS", "SEGUNDOS"];

const FUENTE = path.join(process.cwd(), "public", "fonts", "JetBrainsMono-Bold.ttf");

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** El fondo: cajas y los dos puntos entre ellas. Sin una sola letra. */
function fondoSVG(): Buffer {
  const cajas = CAJAS.map(
    (x) => `<rect x="${x}" y="10" width="${CAJA_W}" height="108" fill="${CAJA}" rx="8"/>`,
  ).join("");

  const puntos = [140, 280, 420]
    .map(
      (x) =>
        `<circle cx="${x}" cy="48" r="5.5" fill="${MORADO}"/>` +
        `<circle cx="${x}" cy="80" r="5.5" fill="${MORADO}"/>`,
    )
    .join("");

  return Buffer.from(
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${W}" height="${H}" fill="${FONDO}"/>${cajas}${puntos}</svg>`,
    "utf8",
  );
}

/** Dibuja un texto con la fuente del repo. */
async function texto(contenido: string, px: number, color: string) {
  return sharp({
    text: {
      text: `<span foreground="${color}">${contenido}</span>`,
      font: "JetBrains Mono",
      fontfile: FUENTE,
      dpi: 72 * (px / 12),
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

type Pieza = { data: Buffer; info: { width: number; height: number } };

/** Centra una pieza dentro de una de las cuatro cajas. */
function centrada(pieza: Pieza, caja: number, cy: number) {
  return {
    input: pieza.data,
    left: Math.round(CAJAS[caja] + (CAJA_W - pieza.info.width) / 2),
    top: Math.round(cy - pieza.info.height / 2),
  };
}

async function svgToRGBA(png: Buffer): Promise<Uint8Array> {
  const { data } = await sharp(png)
    .flatten({ background: FONDO })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function addSeconds(
  d: number, h: number, m: number, s: number, delta: number,
): [number, number, number, number] {
  let ts = s - delta;
  let tm = m, th = h, td = d;
  while (ts < 0) { ts += 60; tm--; }
  while (tm < 0) { tm += 60; th--; }
  while (th < 0) { th += 24; td--; }
  return [Math.max(0, td), Math.max(0, th), Math.max(0, tm), Math.max(0, ts)];
}

/** Falta la fuente: sin ella el GIF saldría con cuadraditos. */
export const fuenteDisponible = () => fs.existsSync(FUENTE);

/** Cuántos GIF se han compuesto en este proceso (lo usan las pruebas). */
export const estadisticas = { generados: 0 };

export async function componerGif(ahora: number): Promise<Buffer> {
  estadisticas.generados++;
  const diff = Math.max(0, EVENT_DATE.getTime() - ahora);

  const baseDays    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const baseHours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const baseMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const baseSeconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Las piezas: diez cifras y cuatro etiquetas, dibujadas una sola vez.
  const cifras = await Promise.all(
    Array.from({ length: 10 }, (_, n) => texto(String(n), 42, TINTA)),
  );
  const etiquetas = await Promise.all(
    ETIQUETAS.map((e) => texto(e, 9, MORADO)),
  );

  const fondo = await sharp(fondoSVG()).png().toBuffer();

  const pixelArrays: Uint8Array[] = [];
  for (let i = 0; i < FRAMES; i++) {
    const valores = addSeconds(baseDays, baseHours, baseMinutes, baseSeconds, i);

    const capas = valores.flatMap((v, caja) => {
      const [a, b] = pad2(v).split("");
      const izq = cifras[Number(a)];
      const der = cifras[Number(b)];
      // Las dos cifras se colocan como un bloque, para que el par quede
      // centrado en la caja y no cada cifra por su cuenta.
      const ancho = izq.info.width + der.info.width;
      const x0 = CAJAS[caja] + (CAJA_W - ancho) / 2;
      const yCifra = 50;
      return [
        { input: izq.data, left: Math.round(x0), top: Math.round(yCifra - izq.info.height / 2) },
        { input: der.data, left: Math.round(x0 + izq.info.width), top: Math.round(yCifra - der.info.height / 2) },
        centrada(etiquetas[caja], caja, 100),
      ];
    });

    const png = await sharp(fondo).composite(capas).png().toBuffer();
    pixelArrays.push(await svgToRGBA(png));
  }

  // Una paleta para todos los cuadros: los colores no cambian entre ellos.
  const palette = quantize(pixelArrays[0], 256);

  const gif = GIFEncoder();
  for (const pixels of pixelArrays) {
    gif.writeFrame(applyPalette(pixels, palette), W, H, {
      palette,
      delay: 1000, // gifenc lo divide entre 10 → 100 centésimas = 1 segundo
      repeat: 0,
    });
  }
  gif.finish();

  return Buffer.from(gif.bytes());
}

/** El contador sólo cambia por segundo: un GIF por ventana basta para todos. */
export const VENTANA_MS = 5000;

let cache: { ventana: number; gif: Promise<Buffer> } | null = null;

export function gifDeLaVentana(ahora = Date.now()): Promise<Buffer> {
  const ventana = Math.floor(ahora / VENTANA_MS);
  if (cache?.ventana === ventana) return cache.gif;
  const gif = componerGif(ventana * VENTANA_MS);
  cache = { ventana, gif };
  // Si falla no se queda cacheado el error.
  gif.catch(() => { if (cache?.gif === gif) cache = null; });
  return gif;
}
