import { LAND } from "@/data/land";

/**
 * La proyección del globo de la portada.
 *
 * Los continentes son polilíneas lat/long (Natural Earth 110m) que se rotan y
 * se proyectan en ortográfica a mano: no hace falta un motor 3D para esto. La
 * usan el canvas interactivo del hero y las imágenes que se generan en el
 * servidor (banner para redes, cabecera de los correos).
 */

export type Punto = { lat: number; lon: number };

const DEG = Math.PI / 180;

/** Rota (lat, lon) por `giro`, inclina el eje y proyecta. `z > 0` es la cara visible. */
export function proyectar(lat: number, lon: number, giro: number, r: number, inclinacion: number) {
  const la = lat * DEG;
  const lo = lon * DEG + giro;
  const cl = Math.cos(la);
  const x = cl * Math.sin(lo);
  const y = Math.sin(la);
  const z = cl * Math.cos(lo);
  const y2 = y * Math.cos(inclinacion) - z * Math.sin(inclinacion);
  const z2 = y * Math.sin(inclinacion) + z * Math.cos(inclinacion);
  return { x: x * r, y: -y2 * r, z: z2 };
}

/**
 * El encuadre que deja un punto de frente: el giro lo trae al meridiano central
 * y la inclinación lo sube o lo baja. Los 12° de más lo dejan algo por debajo
 * del centro, para que se vea el continente y no sólo el punto.
 */
export function encuadre(p: Punto) {
  return { giro: -p.lon * DEG, inclinacion: (p.lat + 12) * DEG };
}

/** Recorre una polilínea y entrega sólo los tramos de la cara visible. */
function tramos(
  puntos: Iterable<[number, number]>,
  giro: number,
  r: number,
  inclinacion: number,
): Array<Array<[number, number]>> {
  const salida: Array<Array<[number, number]>> = [];
  let actual: Array<[number, number]> = [];
  for (const [lat, lon] of puntos) {
    const p = proyectar(lat, lon, giro, r, inclinacion);
    if (p.z < 0) {
      if (actual.length > 1) salida.push(actual);
      actual = [];
    } else {
      actual.push([p.x, p.y]);
    }
  }
  if (actual.length > 1) salida.push(actual);
  return salida;
}

const aPath = (ts: Array<Array<[number, number]>>, cx: number, cy: number) =>
  ts
    .map((t) => t.map(([x, y], i) => `${i ? "L" : "M"}${(cx + x).toFixed(1)} ${(cy + y).toFixed(1)}`).join(""))
    .join("");

function* arco(a: number[]): Generator<[number, number]> {
  for (let i = 0; i < a.length; i += 2) yield [a[i + 1], a[i]];
}

/** El globo como trazos SVG, encuadrado en un punto. Para dibujarlo sin canvas. */
export function globoSvg(marcador: Punto, r: number, cx: number, cy: number) {
  const { giro, inclinacion } = encuadre(marcador);

  const reticula: Array<Array<[number, number]>> = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const meridiano: Array<[number, number]> = [];
    for (let lat = -90; lat <= 90; lat += 5) meridiano.push([lat, lon]);
    reticula.push(...tramos(meridiano, giro, r, inclinacion));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const paralelo: Array<[number, number]> = [];
    for (let lon = -180; lon <= 180; lon += 5) paralelo.push([lat, lon]);
    reticula.push(...tramos(paralelo, giro, r, inclinacion));
  }

  const tierra = LAND.flatMap((a) => tramos(arco(a), giro, r, inclinacion));
  const m = proyectar(marcador.lat, marcador.lon, giro, r, inclinacion);

  return {
    reticula: aPath(reticula, cx, cy),
    tierra: aPath(tierra, cx, cy),
    marcador: { x: cx + m.x, y: cy + m.y },
  };
}

export { LAND };
