/**
 * Mide la portada, /speakers, /registro, /directorio, /admin, /admin/check-in y
 * un pasaporte de la demo contra un servidor ya levantado:
 *   npm run medir -- --url http://localhost:3000
 * Las tres últimas (panel y pasaporte) van con throttling real (devtools) y CPU 6×;
 * el panel entra con la cuenta de la demo (MODO_DEMO).
 *
 * Una página que no se deja medir (NO_NAVSTART, 4xx) se reintenta una vez y, si
 * vuelve a fallar, queda como «sin medir»: la herramienta no tumba el job.
 *
 * Lighthouse móvil (3 pasadas, mediana) y JS de primera carga en gzip leído de `.next/`.
 * Escribe medidas/actual.json; con --comparar lo contrasta con la línea base y
 * sale con código 1 si hay regresiones. Para levantar el servidor:
 *   npm run build && MODO_DEMO=1 npm start
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RUTAS, RUTAS_CON_SESION, banderasDePerfil, comparar, cookieDeSesion, errorDeLighthouse, extraerLighthouse, formatearComparacion, formatearTabla, jsDePrimeraCarga, resumirPasadas } from "./medir-lib.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function leerArgs(argv) {
  const a = { url: "", pasadas: 3, salida: "medidas/actual.json", base: "medidas/linea-base.json", comparar: false, guardarBase: false, rutas: RUTAS };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--url") a.url = argv[++i];
    else if (k === "--pasadas") a.pasadas = Number(argv[++i]);
    else if (k === "--salida") a.salida = argv[++i];
    else if (k === "--base") a.base = argv[++i];
    else if (k === "--rutas") a.rutas = argv[++i].split(",");
    else if (k === "--comparar") a.comparar = true;
    else if (k === "--guardar-base") a.guardarBase = true;
    else fallar(`Argumento desconocido: ${k}`);
  }
  if (!a.url) fallar("Falta --url (un servidor ya levantado, p. ej. --url http://localhost:3000).");
  if (!Number.isInteger(a.pasadas) || a.pasadas < 1) fallar("--pasadas tiene que ser un entero ≥ 1.");
  a.url = a.url.replace(/\/$/, "");
  return a;
}

function fallar(msg) {
  console.error(`medir: ${msg}`);
  process.exit(2);
}

function buscarChromium() {
  const candidatos = [process.env.CHROME_PATH, ...["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"].map((n) => which(n))];
  return candidatos.find((c) => c && existsSync(c)) ?? null;
}

function which(nombre) {
  const r = spawnSync("which", [nombre], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

function comandoLighthouse() {
  const local = path.join(raiz, "node_modules", ".bin", "lighthouse");
  if (existsSync(local)) return [local];
  const global = which("lighthouse");
  if (global) return [global];
  return null;
}

function pasadaLighthouse(cmd, chrome, url, extra = []) {
  const r = spawnSync(cmd[0], [...cmd.slice(1), url, "--output=json", "--quiet", "--form-factor=mobile", "--only-categories=performance,accessibility,seo", '--chrome-flags=--headless=new --no-sandbox', ...extra], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, CHROME_PATH: chrome },
  });
  if (r.status !== 0) throw new Error(`Lighthouse falló en ${url}: ${(r.stderr || r.stdout).slice(0, 400)}`);
  const lhr = JSON.parse(r.stdout);
  const error = errorDeLighthouse(lhr);
  if (error) throw new Error(`Lighthouse no midió ${url}: ${error}`);
  return extraerLighthouse(lhr);
}

/** Entra en el panel de la demo y devuelve la cabecera Cookie; null si no se puede. */
async function sesionDeLaDemo(base) {
  try {
    const r = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "demo@example.com", password: "demo-demo-demo" }),
    });
    if (!r.ok) return null;
    return cookieDeSesion(r.headers.getSetCookie()) || null;
  } catch {
    return null;
  }
}

const args = leerArgs(process.argv.slice(2));

const chrome = buscarChromium();
if (!chrome) fallar("no hay Chromium/Chrome. Instálalo o define CHROME_PATH con su ruta.");
const lighthouse = comandoLighthouse();
if (!lighthouse) fallar("no está instalado `lighthouse`. Instálalo (npm i -g lighthouse) y vuelve a correr.");
const dirNext = path.join(raiz, ".next");
if (!existsSync(dirNext)) fallar("no existe .next/: corre `npm run build` antes.");

const paginas = {};
let cookie;
if (args.rutas.some((r) => RUTAS_CON_SESION.includes(r))) cookie = await sesionDeLaDemo(args.url);

for (const ruta of args.rutas) {
  const url = args.url + ruta;
  const conSesion = RUTAS_CON_SESION.includes(ruta);
  const sinMedir = (motivo) => {
    console.warn(`medir: ${ruta}: sin medir (${motivo})`);
    paginas[ruta] = { sinMedir: true, motivo };
  };
  if (conSesion && !cookie) {
    sinMedir("no se pudo iniciar sesión en la demo");
    continue;
  }
  const cabeceras = conSesion ? { cookie } : {};
  // Tras cerrar Chrome, la primera petición a veces falla con el socket reutilizado.
  let res;
  for (let intento = 1; !res; intento++) {
    res = await fetch(url, { headers: cabeceras }).catch((e) => {
      if (intento >= 3) fallar(`no responde ${url}: ${e.message}`);
      return new Promise((r) => setTimeout(() => r(undefined), 1000));
    });
  }
  if (!res.ok) {
    sinMedir(`devolvió ${res.status}`);
    continue;
  }
  const js = jsDePrimeraCarga(await res.text(), dirNext);
  if (js.faltan.length) console.warn(`medir: ${ruta}: ${js.faltan.length} script(s) no están en .next/ (¿otro build?).`);
  const extra = [...banderasDePerfil(ruta), ...(conSesion ? [`--extra-headers=${JSON.stringify({ Cookie: cookie })}`] : [])];
  const pasadas = [];
  let motivo = null;
  for (let i = 0; i < args.pasadas && !motivo; i++) {
    console.error(`${ruta}: pasada ${i + 1}/${args.pasadas}`);
    // Un fallo de la herramienta (NO_NAVSTART...) se reintenta una vez; si repite, la página queda sin medir.
    for (let intento = 1; intento <= 2; intento++) {
      try {
        pasadas.push(pasadaLighthouse(lighthouse, chrome, url, extra));
        break;
      } catch (e) {
        console.warn(`medir: ${ruta}: intento ${intento}/2 falló: ${e.message.slice(0, 200)}`);
        if (intento === 2) motivo = e.message.slice(0, 200);
      }
    }
  }
  if (motivo) sinMedir(motivo);
  else paginas[ruta] = { ...resumirPasadas(pasadas), js: Math.round(js.kb * 10) / 10 };
}

const resultado = { fecha: new Date().toISOString(), pasadas: args.pasadas, dispositivo: "móvil", paginas };
const escribir = (ruta) => {
  const destino = path.resolve(raiz, ruta);
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(resultado, null, 2) + "\n");
  console.log(`Escrito ${path.relative(raiz, destino)}`);
};
console.log(formatearTabla(paginas));
escribir(args.salida);
if (args.guardarBase) escribir(args.base);

if (args.comparar) {
  const rutaBase = path.resolve(raiz, args.base);
  if (!existsSync(rutaBase)) fallar(`no hay línea base en ${args.base}; créala con --guardar-base.`);
  const filas = comparar(resultado, JSON.parse(readFileSync(rutaBase, "utf8")));
  console.log("\n" + formatearComparacion(filas));
  if (filas.some((f) => f.regresion)) process.exit(1);
}
