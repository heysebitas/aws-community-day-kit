/**
 * Rehace las capturas de la documentación (`docs/img/galeria/`):
 *
 *   npm run demo -- --produccion   # en otra terminal: compilada, sin el indicador de Next
 *   npm run galeria              # o: node scripts/galeria.mjs http://localhost:3000
 *
 * Saca cada página en escritorio y en teléfono, entra al panel con la cuenta de
 * la demo y guarda todo en WebP. Hay que correrlo sobre la demo: las capturas
 * muestran los datos inventados de `src/lib/demo.ts`, nunca los de un evento real.
 * Con `--solo portada,panel-inicio` rehace sólo esas.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("http")) ?? "http://localhost:3000").replace(/\/$/, "");
const solo = args.includes("--solo") ? new Set(args[args.indexOf("--solo") + 1]?.split(",")) : null;
const destino = path.join(raiz, "docs/img/galeria");

const ESCRITORIO = { ancho: 1440, alto: 900, escala: 1, salida: 1440 };
const MOVIL = { ancho: 390, alto: 844, escala: 2, salida: 780 };

/** nombre · ruta · dispositivo · ¿con sesión? · ¿página entera? */
const CAPTURAS = [
  ["portada", "/", ESCRITORIO],
  ["portada-movil", "/", MOVIL],
  ["portada-completa", "/", { ...ESCRITORIO, completa: true, salida: 720 }],
  ["portada-en", "/en", ESCRITORIO],
  ["registro", "/registro", ESCRITORIO],
  ["registro-movil", "/registro", MOVIL],
  ["speakers", "/speakers", ESCRITORIO],
  ["speakers-postular", "/speakers/postular", ESCRITORIO],
  ["voluntarios", "/voluntarios", ESCRITORIO],
  ["directorio", "/directorio", ESCRITORIO],
  ["directorio-movil", "/directorio", MOVIL],
  ["perfil-speaker", "/speakers/sofia-navarro", ESCRITORIO],
  ["pasaporte-movil", "/pasaporte/demo00000001", MOVIL],
  ["no-encontrado", "/no-existe", ESCRITORIO],
  ["panel-login", "/admin/login", ESCRITORIO],
  ["panel-inicio", "/admin", { ...ESCRITORIO, sesion: true }],
  ["panel-inicio-movil", "/admin", { ...MOVIL, sesion: true }],
  ["panel-registros", "/admin/registrations", { ...ESCRITORIO, sesion: true }],
  ["panel-registros-movil", "/admin/registrations", { ...MOVIL, sesion: true }],
  ["panel-check-in-movil", "/admin/check-in", { ...MOVIL, sesion: true }],
  ["panel-speakers", "/admin/speakers", { ...ESCRITORIO, sesion: true }],
  ["panel-tarjetas", "/admin/speakers/canvas", { ...ESCRITORIO, sesion: true }],
  ["panel-programa", "/admin/programa", { ...ESCRITORIO, sesion: true }],
  ["panel-voluntarios", "/admin/volunteers", { ...ESCRITORIO, sesion: true }],
  ["panel-plantillas", "/admin/correos/plantillas", { ...ESCRITORIO, sesion: true }],
  ["panel-campanas", "/admin/correos/campanas", { ...ESCRITORIO, sesion: true }],
  ["panel-pasaportes", "/admin/pasaportes", { ...ESCRITORIO, sesion: true }],
  ["panel-certificados", "/admin/certificados", { ...ESCRITORIO, sesion: true }],
  ["panel-usuarios", "/admin/users", { ...ESCRITORIO, sesion: true }],
  ["panel-config", "/admin/config", { ...ESCRITORIO, sesion: true }],
];

async function sesion() {
  const r = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "demo@example.com", password: "demo-demo-demo" }),
  });
  const cookie = r.headers.getSetCookie?.().find((c) => /sesion=/.test(c));
  if (!r.ok || !cookie) throw new Error(`No pude entrar al panel (${r.status}). ¿Está corriendo \`npm run demo\` en ${base}?`);
  return cookie.split(";")[0];
}

const r = await fetch(`${base}/api/evento`).catch(() => null);
if (!r?.ok) {
  console.error(`No responde ${base}. Arranca la demo con \`npm run demo\` y vuelve a correr esto.`);
  process.exit(1);
}

fs.mkdirSync(destino, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "galeria-"));
// Una sola sesión para todas: el login tiene límite de intentos por IP.
const cookie = CAPTURAS.some(([n, , d]) => d.sesion && (!solo || solo.has(n))) ? await sesion() : "";

for (const [nombre, ruta, d] of CAPTURAS) {
  if (solo && !solo.has(nombre)) continue;
  const png = path.join(tmp, `${nombre}.png`);
  execFileSync(process.execPath, [path.join(raiz, "scripts/captura.mjs"), base + ruta, png, String(d.ancho), String(d.alto)], {
    stdio: ["ignore", "ignore", "inherit"],
    env: {
      ...process.env,
      CAPTURA_ESCALA: String(d.escala),
      CAPTURA_SOLO_VISTA: d.completa ? "" : "1",
      CAPTURA_COOKIE: d.sesion ? cookie : "",
      // Las vistas que cargan datos en el cliente (pasaporte, panel) necesitan más margen.
      CAPTURA_ESPERA: String(d.espera ?? 6000),
    },
  });
  const webp = path.join(destino, `${nombre}.webp`);
  const info = await sharp(png).resize({ width: d.salida }).webp({ quality: 78, effort: 6 }).toFile(webp);
  console.log(`${nombre.padEnd(24)} ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
}

// La presentación del README: la portada en escritorio con el teléfono encima.
const escritorio = path.join(destino, "portada.webp");
const telefono = path.join(destino, "portada-movil.webp");
if ((!solo || solo.has("presentacion")) && fs.existsSync(escritorio) && fs.existsSync(telefono)) {
  const ANCHO = 1600, ALTO = 940, MARGEN = 40, BORDE = 6;
  const pc = await sharp(escritorio).resize({ width: 1240 }).toBuffer({ resolveWithObject: true });
  const tel = await sharp(telefono).resize({ width: 360 }).toBuffer({ resolveWithObject: true });
  const marco = (w, h) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#000"/><rect x="${BORDE / 2}" y="${BORDE / 2}" width="${w - BORDE}" height="${h - BORDE}" fill="none" stroke="#3A3A4A" stroke-width="${BORDE}"/></svg>`);
  const xTel = ANCHO - MARGEN - tel.info.width - BORDE * 2;
  const yTel = ALTO - MARGEN - Math.min(tel.info.height, ALTO - MARGEN * 2) - BORDE * 2;
  const altoTel = Math.min(tel.info.height, ALTO - MARGEN * 2);
  const telRecorte = await sharp(tel.data).extract({ left: 0, top: 0, width: tel.info.width, height: altoTel }).toBuffer();
  const info = await sharp({ create: { width: ANCHO, height: ALTO, channels: 3, background: "#16161F" } })
    .composite([
      { input: marco(pc.info.width + BORDE * 2, pc.info.height + BORDE * 2), left: MARGEN, top: MARGEN },
      { input: pc.data, left: MARGEN + BORDE, top: MARGEN + BORDE },
      { input: marco(tel.info.width + BORDE * 2, altoTel + BORDE * 2), left: xTel, top: yTel },
      { input: telRecorte, left: xTel + BORDE, top: yTel + BORDE },
    ])
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(destino, "presentacion.webp"));
  console.log(`${"presentacion".padEnd(24)} ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
}

// La hoja de temas (docs/img/temas.webp): la portada con cada tema, vía `?tema=` (sólo en modo demo).
if (!solo || solo.has("temas")) {
  for (const tema of ["naranja", "lavanda", "platano", "menta", "cielo", "coral", "rosa", "lima"]) {
    execFileSync(process.execPath, [path.join(raiz, "scripts/captura.mjs"), `${base}/?tema=${tema}`, path.join(tmp, `tema-${tema}.png`), "1440", "900"], {
      stdio: ["ignore", "ignore", "inherit"],
      env: { ...process.env, CAPTURA_SOLO_VISTA: "1", CAPTURA_ESCALA: "1", CAPTURA_ESPERA: "6000", CAPTURA_COOKIE: "" },
    });
  }
  execFileSync(process.execPath, [path.join(raiz, "scripts/hoja-de-temas.mjs"), tmp, path.join(tmp, "temas.png")], { stdio: "ignore" });
  const info = await sharp(path.join(tmp, "temas.png")).webp({ quality: 80, effort: 6 }).toFile(path.join(raiz, "docs/img/temas.webp"));
  console.log(`${"temas".padEnd(24)} ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
}

fs.rmSync(tmp, { recursive: true, force: true });
