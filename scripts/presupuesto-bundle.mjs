/**
 * Presupuesto de bundle: JS de primera carga (gzip) de cada ruta pública, leído de `.next/`.
 *
 *   node scripts/presupuesto-bundle.mjs --salida medidas/bundle.json
 *   node scripts/presupuesto-bundle.mjs --next otro/.next --salida base.json   (medir otro checkout)
 *   node scripts/presupuesto-bundle.mjs --base base/bundle.json [--umbral 10] [--fallar]
 *
 * Con --base compara contra la medida de la rama base y avisa si alguna ruta sube
 * más del umbral (%). Sólo falla con --fallar. Hay que haber corrido `npm run build`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsDePrimeraCarga } from "./medir-lib.mjs";

/** Ruta pública → HTML prerrenderizado (idioma por defecto) dentro de `.next/server/app`. */
export const RUTAS = { "/": "es.html", "/speakers": "es/speakers.html", "/registro": "es/registro.html", "/directorio": "es/directorio.html" };

/** Cambio porcentual de cada ruta; `sube` si supera el umbral. Las rutas sin base se ignoran. */
export function compararBundles(actual, base, umbral = 10) {
  const filas = [];
  for (const [ruta, kb] of Object.entries(actual)) {
    const antes = base[ruta];
    if (typeof antes !== "number" || antes <= 0 || typeof kb !== "number") continue;
    const pct = ((kb - antes) / antes) * 100;
    filas.push({ ruta, base: antes, actual: kb, pct, sube: pct > umbral });
  }
  return filas;
}

export function formatearBundles(filas, umbral = 10) {
  if (!filas.length) return "Nada que comparar: la base no comparte rutas.";
  const lineas = ["ruta\tbase KB\tahora KB\tcambio"];
  for (const f of filas) {
    const signo = f.pct > 0 ? "+" : "";
    lineas.push(`${f.ruta}\t${f.base.toFixed(1)}\t${f.actual.toFixed(1)}\t${signo}${f.pct.toFixed(1)} %${f.sube ? `  SUPERA ${umbral} %` : ""}`);
  }
  return lineas.join("\n");
}

export function medirBundle(dirNext, rutas = RUTAS) {
  const salida = {};
  for (const [ruta, archivo] of Object.entries(rutas)) {
    const html = path.join(dirNext, "server", "app", archivo);
    if (!existsSync(html)) throw new Error(`no existe ${html}: ¿corriste \`npm run build\`?`);
    salida[ruta] = Math.round(jsDePrimeraCarga(readFileSync(html, "utf8"), dirNext).kb * 10) / 10;
  }
  return salida;
}

function main(argv) {
  const a = { salida: "", base: "", umbral: 10, fallar: false, next: "" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--salida") a.salida = argv[++i];
    else if (argv[i] === "--base") a.base = argv[++i];
    else if (argv[i] === "--umbral") a.umbral = Number(argv[++i]);
    else if (argv[i] === "--next") a.next = argv[++i];
    else if (argv[i] === "--fallar") a.fallar = true;
    else throw new Error(`Argumento desconocido: ${argv[i]}`);
  }
  if (!Number.isFinite(a.umbral) || a.umbral < 0) throw new Error("--umbral tiene que ser un número ≥ 0.");
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const actual = medirBundle(path.resolve(a.next || path.join(raiz, ".next")));
  console.log(Object.entries(actual).map(([r, kb]) => `${r}\t${kb} KB`).join("\n"));
  if (a.salida) {
    mkdirSync(path.dirname(path.resolve(a.salida)), { recursive: true });
    writeFileSync(path.resolve(a.salida), JSON.stringify(actual, null, 2) + "\n");
  }
  if (!a.base) return 0;
  if (!existsSync(a.base)) {
    console.log(`\nSin medida de la rama base en ${a.base}: nada que comparar.`);
    return 0;
  }
  const filas = compararBundles(actual, JSON.parse(readFileSync(a.base, "utf8")), a.umbral);
  console.log("\n" + formatearBundles(filas, a.umbral));
  const suben = filas.filter((f) => f.sube);
  for (const f of suben) {
    const msg = `El JS de primera carga de ${f.ruta} sube ${f.pct.toFixed(1)} % (${f.base.toFixed(1)} → ${f.actual.toFixed(1)} KB gzip), más de ${a.umbral} %.`;
    console.log(process.env.GITHUB_ACTIONS ? `::warning title=Presupuesto de bundle::${msg}` : `AVISO: ${msg}`);
  }
  return suben.length && a.fallar ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(`presupuesto-bundle: ${e.message}`);
    process.exit(2);
  }
}
