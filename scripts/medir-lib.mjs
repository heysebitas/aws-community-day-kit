/**
 * Parte pura de `npm run medir`: mediana, resumen de pasadas, comparación con la
 * línea base y formato. No toca red ni disco, para poder probarla sin Chromium.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

export const RUTAS_PUBLICAS = ["/", "/speakers", "/registro", "/directorio"];

/** Lo que usa el staff con el móvil el día del evento: panel (con sesión de la demo) y un pasaporte. Se miden con throttling real (devtools) y CPU 6×. */
export const RUTAS_REAL = ["/admin", "/admin/check-in", "/pasaporte/demo00000001"];
export const RUTAS_CON_SESION = ["/admin", "/admin/check-in"];
export const CPU_REAL = 6;

export const RUTAS = [...RUTAS_PUBLICAS, ...RUTAS_REAL];

/** Banderas de Lighthouse según la ruta: simulado para las públicas, devtools con CPU 6× para las reales. */
export function banderasDePerfil(ruta) {
  return RUTAS_REAL.includes(ruta) ? ["--throttling-method=devtools", `--throttling.cpuSlowdownMultiplier=${CPU_REAL}`] : [];
}

/** Lighthouse sale con código 0 aunque no haya medido (NO_NAVSTART, etc.): el fallo viene en `runtimeError`. */
export function errorDeLighthouse(lhr) {
  if (lhr?.runtimeError?.code && lhr.runtimeError.code !== "NO_ERROR") return `${lhr.runtimeError.code}: ${lhr.runtimeError.message ?? ""}`.slice(0, 300);
  if (lhr?.categories?.performance?.score == null) return "sin puntuación de rendimiento";
  return null;
}

/** La cookie de sesión (`nombre=valor`) a partir de las cabeceras Set-Cookie de la respuesta del login. */
export function cookieDeSesion(setCookies) {
  return (setCookies ?? []).map((c) => c.split(";")[0]).filter(Boolean).join("; ");
}

/** Qué sentido es «peor» en cada métrica y cuánto cambio se tolera antes de marcarlo. */
export const METRICAS = {
  // La puntuación de rendimiento varía ~8 puntos entre corridas en el runner.
  rendimiento: { mejor: "alto", tolerancia: 8, unidad: "" },
  accesibilidad: { mejor: "alto", tolerancia: 3, unidad: "" },
  seo: { mejor: "alto", tolerancia: 3, unidad: "" },
  fcp: { mejor: "bajo", tolerancia: 200, unidad: " ms" },
  // El runner de GitHub varía ~600 ms de LCP y ~150 ms de TBT entre corridas del mismo código.
  lcp: { mejor: "bajo", tolerancia: 600, unidad: " ms" },
  tbt: { mejor: "bajo", tolerancia: 150, unidad: " ms" },
  cls: { mejor: "bajo", tolerancia: 0.02, unidad: "" },
  peso: { mejor: "bajo", tolerancia: 20, unidad: " KB" },
  js: { mejor: "bajo", tolerancia: 10, unidad: " KB" },
};

export function mediana(valores) {
  const v = valores.filter((x) => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** De la salida JSON de Lighthouse a las métricas de una pasada. Puntuaciones 0-100, tiempos en ms, peso en KB. */
export function extraerLighthouse(lhr) {
  const cat = (k) => (lhr.categories?.[k]?.score == null ? null : Math.round(lhr.categories[k].score * 100));
  const aud = (k) => lhr.audits?.[k]?.numericValue ?? null;
  const bytes = aud("total-byte-weight");
  return {
    rendimiento: cat("performance"),
    accesibilidad: cat("accessibility"),
    seo: cat("seo"),
    fcp: aud("first-contentful-paint"),
    lcp: aud("largest-contentful-paint"),
    tbt: aud("total-blocking-time"),
    cls: aud("cumulative-layout-shift"),
    peso: bytes == null ? null : bytes / 1024,
  };
}

/** Mediana de cada métrica entre las pasadas. */
export function resumirPasadas(pasadas) {
  const claves = new Set(pasadas.flatMap((p) => Object.keys(p)));
  const salida = {};
  for (const k of claves) {
    const m = mediana(pasadas.map((p) => p[k]));
    salida[k] = m == null ? null : redondear(k, m);
  }
  return salida;
}

function redondear(clave, valor) {
  if (clave === "cls") return Math.round(valor * 1000) / 1000;
  return Math.round(valor * 10) / 10;
}

/** Scripts de la primera carga (los `<script src>` del HTML) y su peso gzip leyendo `.next/`. */
export function jsDePrimeraCarga(html, dirNext) {
  const rutas = new Set();
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
    const url = m[1].split("?")[0];
    if (url.startsWith("/_next/")) rutas.add(url.slice("/_next/".length));
  }
  let bytes = 0;
  const faltan = [];
  for (const r of rutas) {
    try {
      bytes += gzipSync(readFileSync(path.join(dirNext, decodeURIComponent(r)))).length;
    } catch {
      faltan.push(r);
    }
  }
  return { ficheros: rutas.size, kb: bytes / 1024, faltan };
}

/** Diferencias contra la línea base; `regresion` si empeora más que la tolerancia de la métrica. */
export function comparar(actual, base) {
  const filas = [];
  for (const [ruta, nuevo] of Object.entries(actual.paginas ?? {})) {
    const viejo = base.paginas?.[ruta];
    if (!viejo) continue;
    for (const [k, def] of Object.entries(METRICAS)) {
      const a = nuevo[k];
      const b = viejo[k];
      if (a == null || b == null) continue;
      const delta = a - b;
      const peor = def.mejor === "alto" ? -delta : delta;
      filas.push({ ruta, metrica: k, base: b, actual: a, delta, regresion: peor > def.tolerancia });
    }
  }
  return filas;
}

const num = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(Math.abs(n) < 1 ? 3 : 1));

export function formatearComparacion(filas) {
  if (!filas.length) return "Nada que comparar: la línea base no comparte páginas.";
  const lineas = ["página\tmétrica\tbase\tahora\tcambio"];
  for (const f of filas) {
    const u = METRICAS[f.metrica].unidad;
    const signo = f.delta > 0 ? "+" : "";
    lineas.push(`${f.ruta}\t${f.metrica}\t${num(f.base)}${u}\t${num(f.actual)}${u}\t${signo}${num(f.delta)}${f.regresion ? "  REGRESIÓN" : ""}`);
  }
  const n = filas.filter((f) => f.regresion).length;
  lineas.push(n ? `\n${n} regresión(es).` : "\nSin regresiones.");
  return lineas.join("\n");
}

export function formatearTabla(paginas) {
  const cols = Object.keys(METRICAS);
  const lineas = [["página", ...cols].join("\t")];
  for (const [ruta, m] of Object.entries(paginas)) {
    if (m.sinMedir) lineas.push(`${ruta}\tsin medir: ${m.motivo ?? "?"}`);
    else lineas.push([ruta, ...cols.map((c) => (m[c] == null ? "-" : num(m[c])))].join("\t"));
  }
  return lineas.join("\n");
}
