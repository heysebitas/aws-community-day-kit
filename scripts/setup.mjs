/**
 * Configura la edición: escribe `evento/config.ts`, `evento/contacto.ts` y, si
 * no existe, `.env.local`.
 *
 *   npm run setup                          → pregunta en la terminal
 *   npm run setup -- --desde respuestas.json   → sin preguntas (para asistentes de IA)
 *   npm run setup -- --plantilla           → imprime un respuestas.json de ejemplo
 *
 * No toca nada más. El contenido (equipo, keynotes, patrocinadores, tracks) se
 * edita después en los demás archivos de `evento/`.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

/** Lo mínimo de cada país para proponer valores por omisión. La fuente completa es `src/config/paises.ts`. */
const PAISES = {
  AR: ["Argentina", "Buenos Aires", -34.6, -58.38], BO: ["Bolivia", "La Paz", -16.5, -68.15],
  BR: ["Brasil", "Brasília", -15.79, -47.88], CL: ["Chile", "Santiago", -33.45, -70.66],
  CO: ["Colombia", "Bogotá", 4.71, -74.07], CR: ["Costa Rica", "San José", 9.93, -84.08],
  CU: ["Cuba", "La Habana", 23.11, -82.37], DO: ["República Dominicana", "Santo Domingo", 18.49, -69.93],
  EC: ["Ecuador", "Quito", -0.18, -78.47], SV: ["El Salvador", "San Salvador", 13.69, -89.22],
  GT: ["Guatemala", "Ciudad de Guatemala", 14.63, -90.51], HN: ["Honduras", "Tegucigalpa", 14.07, -87.19],
  MX: ["México", "Ciudad de México", 19.43, -99.13], NI: ["Nicaragua", "Managua", 12.11, -86.24],
  PA: ["Panamá", "Ciudad de Panamá", 8.98, -79.52], PY: ["Paraguay", "Asunción", -25.26, -57.58],
  PE: ["Perú", "Lima", -12.05, -77.04], PR: ["Puerto Rico", "San Juan", 18.47, -66.11],
  UY: ["Uruguay", "Montevideo", -34.9, -56.16], VE: ["Venezuela", "Caracas", 10.48, -66.9],
};
const TEMAS = ["naranja", "lavanda", "platano", "menta", "cielo", "coral", "rosa", "lima"];

const PLANTILLA = {
  nombre: "AWS Student Community Day",
  siglas: "SCD",
  pais: "CO",
  edicion: "Colombia",
  anio: 2027,
  ciudad: "Bogotá",
  organiza: "AWS Student Builder Groups Colombia",
  sitio: "https://tu-dominio.com",
  inicio: "2027-10-23T08:30",
  fin: "2027-10-23T18:00",
  sede: {
    nombre: "Universidad Ejemplo — Campus Central",
    direccion: "Calle 1 # 2-34",
    localidad: "Bogotá",
    lat: 4.71,
    lon: -74.07,
    mapa: "https://maps.app.goo.gl/…",
    comoLlegar: "Llegas en transporte público hasta la estación más cercana y de ahí caminando.",
  },
  cupos: 300,
  presencial: true,
  online: true,
  tema: "naranja",
  idiomas: ["es", "en"],
  instagram: "",
  linkedin: "",
  cfpCierre: "2027-09-22T23:59",
  cfpSlides: "2027-10-13T23:59",
  contacto: { general: "contacto@tu-dominio.com", privacidad: "privacidad@tu-dominio.com", patrocinios: "patrocinios@tu-dominio.com" },
};

if (args.includes("--plantilla")) {
  console.log(JSON.stringify(PLANTILLA, null, 2));
  process.exit(0);
}

// ── Validación ───────────────────────────────────────────────────────────────

const FECHA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function validar(r) {
  const errores = [];
  const pedir = (cond, texto) => { if (!cond) errores.push(texto); };
  pedir(typeof r.nombre === "string" && r.nombre.trim(), "nombre: falta");
  pedir(typeof r.siglas === "string" && r.siglas.trim(), "siglas: falta");
  pedir(PAISES[r.pais], `pais: «${r.pais}» no es un código válido (${Object.keys(PAISES).join(", ")})`);
  pedir(Number.isInteger(r.anio) && r.anio >= 2024, "anio: tiene que ser un año");
  pedir(typeof r.ciudad === "string" && r.ciudad.trim(), "ciudad: falta");
  pedir(FECHA.test(r.inicio ?? ""), "inicio: formato 2027-10-23T08:30 (hora local del evento)");
  pedir(FECHA.test(r.fin ?? ""), "fin: formato 2027-10-23T18:00");
  pedir(!FECHA.test(r.inicio ?? "") || !FECHA.test(r.fin ?? "") || r.fin > r.inicio, "fin: tiene que ser posterior a inicio");
  pedir(FECHA.test(r.cfpCierre ?? ""), "cfpCierre: formato 2027-09-22T23:59");
  pedir(!FECHA.test(r.cfpCierre ?? "") || r.cfpCierre < r.inicio, "cfpCierre: tiene que ser anterior al evento");
  pedir(FECHA.test(r.cfpSlides ?? ""), "cfpSlides: formato 2027-10-13T23:59");
  pedir(/^https?:\/\//.test(r.sitio ?? ""), "sitio: lleva el protocolo, https://tu-dominio");
  pedir(r.sede?.nombre && r.sede?.direccion, "sede: faltan nombre y dirección");
  pedir(Number.isInteger(r.cupos) && r.cupos > 0, "cupos: entero positivo");
  pedir(r.presencial || r.online, "modalidad: presencial u online, al menos una");
  pedir(TEMAS.includes(r.tema) || /^#[0-9a-fA-F]{6}$/.test(r.tema ?? ""), `tema: uno de ${TEMAS.join(", ")} o un color como #12AB34`);
  pedir(Array.isArray(r.idiomas) && r.idiomas.length && r.idiomas.every((i) => ["es", "en"].includes(i)), "idiomas: una lista con es y/o en; el primero es el principal");
  return errores;
}

// ── Preguntas ────────────────────────────────────────────────────────────────

async function preguntar() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const p = async (texto, defecto) => {
    const r = (await rl.question(`${texto}${defecto !== undefined && defecto !== "" ? ` [${defecto}]` : ""}: `)).trim();
    return r || (defecto ?? "");
  };
  const siNo = async (texto, defecto) => /^s/i.test(await p(`${texto} (s/n)`, defecto ? "s" : "n"));
  const restar = (fecha, dias, hora) => {
    const d = new Date(`${fecha.slice(0, 10)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - dias);
    return `${d.toISOString().slice(0, 10)}T${hora}`;
  };

  console.log("\nVamos a configurar tu edición. Enter acepta el valor entre corchetes.\n");
  const r = {};
  r.nombre = await p("Nombre del evento, sin país ni año", PLANTILLA.nombre);
  r.siglas = await p("Siglas", PLANTILLA.siglas);
  console.log("\nPaíses: " + Object.entries(PAISES).map(([c, v]) => `${c} ${v[0]}`).join(" · "));
  r.pais = (await p("Código del país", "CO")).toUpperCase();
  const [nombrePais, capital, lat, lon] = PAISES[r.pais] ?? PAISES.CO;
  r.edicion = await p("Qué va después del nombre (el país o la ciudad)", nombrePais);
  r.anio = Number(await p("Año", new Date().getFullYear() + 1));
  r.ciudad = await p("Ciudad", capital);
  r.organiza = await p("Quién organiza", `AWS Student Builder Groups ${nombrePais}`);
  r.sitio = await p("Dominio del sitio, con https://", "https://tu-dominio.com");

  console.log("\nFechas en hora local del evento, formato AAAA-MM-DDTHH:MM");
  r.inicio = await p("Apertura de puertas", `${r.anio}-10-23T08:30`);
  r.fin = await p("Cierre", `${r.inicio.slice(0, 10)}T18:00`);

  r.sede = {};
  r.sede.nombre = await p("\nNombre de la sede", "Por confirmar");
  r.sede.direccion = await p("Dirección", "Por confirmar");
  r.sede.localidad = await p("Barrio o comuna y ciudad", r.ciudad);
  r.sede.lat = Number(await p("Latitud de la sede (para el globo)", lat));
  r.sede.lon = Number(await p("Longitud", lon));
  r.sede.mapa = await p("Enlace de «cómo llegar»", `https://www.openstreetmap.org/#map=14/${r.sede.lat}/${r.sede.lon}`);
  r.sede.comoLlegar = await p("Cómo se llega, en una frase", "Llegas en transporte público o en vehículo particular.");

  r.cupos = Number(await p("\nCupos que se anuncian", 300));
  r.presencial = await siNo("¿Hay asistencia presencial?", true);
  r.online = await siNo("¿Hay track online?", false);
  console.log("\nTemas: " + TEMAS.join(", ") + " — o un color como #12AB34");
  r.tema = await p("Tema", "naranja");
  r.idiomas = (await p("Idiomas, el principal primero (es, en)", "es, en")).split(",").map((x) => x.trim()).filter(Boolean);
  r.instagram = await p("Instagram del evento (URL, opcional)", "");
  r.linkedin = await p("LinkedIn (URL, opcional)", "");

  r.cfpCierre = await p("\nCierre del Call for Speakers", restar(r.inicio, 31, "23:59"));
  r.cfpSlides = await p("Entrega de diapositivas", restar(r.inicio, 10, "23:59"));

  const dominio = (() => { try { return new URL(r.sitio).host; } catch { return "tu-dominio.com"; } })();
  r.contacto = {
    general: await p("\nCorreo de contacto", `contacto@${dominio}`),
    privacidad: await p("Correo para temas de privacidad", `privacidad@${dominio}`),
    patrocinios: await p("Correo para patrocinios", `patrocinios@${dominio}`),
  };
  rl.close();
  return r;
}

// ── Escritura ────────────────────────────────────────────────────────────────

const q = (v) => JSON.stringify(v ?? "");

/** «23 – 27 sep 2027» a partir de una fecha y una duración. */
function rango(desde, dias, idioma) {
  const a = new Date(`${desde}T12:00:00Z`);
  const b = new Date(a);
  b.setUTCDate(b.getUTCDate() + dias - 1);
  const mes = (d) => d.toLocaleDateString(idioma === "en" ? "en-US" : "es", { month: "short", timeZone: "UTC" }).replace(".", "");
  const mismo = a.getUTCMonth() === b.getUTCMonth();
  if (idioma === "en") {
    return mismo ? `${mes(a)} ${a.getUTCDate()} – ${b.getUTCDate()}, ${b.getUTCFullYear()}` : `${mes(a)} ${a.getUTCDate()} – ${mes(b)} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
  }
  return mismo ? `${a.getUTCDate()} – ${b.getUTCDate()} ${mes(a)} ${b.getUTCFullYear()}` : `${a.getUTCDate()} ${mes(a)} – ${b.getUTCDate()} ${mes(b)} ${b.getUTCFullYear()}`;
}

function configTs(r) {
  const sumar = (fecha, dias) => {
    const d = new Date(`${fecha.slice(0, 10)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  const revision = sumar(r.cfpCierre, 1);
  const seleccion = sumar(r.cfpCierre, 6);
  const redes = [r.instagram && `    instagram: ${q(r.instagram)},`, r.linkedin && `    linkedin: ${q(r.linkedin)},`].filter(Boolean).join("\n");

  return `import { definirEvento } from "@/config/definir";

/**
 * La edición.
 *
 * Todo lo que distingue a tu evento de otro está en esta carpeta (\`evento/\`) y
 * en \`public/evento/\`. El resto del repo es el kit y no hace falta tocarlo.
 * Los campos están explicados en \`src/config/tipos.ts\` y en \`docs/configuracion.md\`.
 */
export default definirEvento({
  nombre: ${q(r.nombre)},
  siglas: ${q(r.siglas)},
  edicion: ${q(r.edicion)},
  anio: ${r.anio},
  pais: ${q(r.pais)},
  ciudad: ${q(r.ciudad)},
  marca: {
    logo: "/images/logos/aws-logo.svg",
    logoPng: "/images/logos/aws-logo.png",
    alt: "AWS",
    lineas: ["Student", "Community Day"],
  },
  organiza: ${q(r.organiza)},
  sitio: ${q(r.sitio)},

  fecha: {
    inicio: ${q(r.inicio)},
    fin: ${q(r.fin)},
    confirmada: true,
  },

  sede: {
    nombre: ${q(r.sede.nombre)},
    direccion: ${q(r.sede.direccion)},
    localidad: ${q(r.sede.localidad || r.ciudad)},
    coordenadas: { lat: ${Number(r.sede.lat)}, lon: ${Number(r.sede.lon)} },
    mapa: ${q(r.sede.mapa)},
    silueta: "auto",
  },

  cupos: ${r.cupos},
  modalidad: { presencial: ${!!r.presencial}, online: ${!!r.online} },

  tema: ${q(r.tema)},
  idiomas: ${JSON.stringify(r.idiomas)},
  rastreoIA: true,

  redes: {
${redes}
  },

  cfp: {
    cierre: ${q(r.cfpCierre)},
    slides: ${q(r.cfpSlides)},
    online: false,
    hitos: {
      revision: { label: ${q(rango(revision, 5, "es"))}, en: ${q(rango(revision, 5, "en"))} },
      seleccion: { label: ${q(rango(seleccion, 2, "es"))}, en: ${q(rango(seleccion, 2, "en"))} },
    },
  },

  detalles: {
    comoLlegar: {
      label: ${q(r.sede.comoLlegar || "")},
      en: ${q(r.sede.comoLlegarEn || r.sede.comoLlegar || "")},
    },
    legalActualizado: ${q(new Date().toISOString().slice(0, 10))},
  },

  hechoPor: { nombre: "Sebastián Acuña", url: "https://github.com/heysebitas" },
});
`;
}

function contactoTs(c) {
  return `/**
 * Los buzones del evento.
 *
 * Este archivo sólo se lee en el servidor: las direcciones llegan al navegador
 * codificadas y el enlace \`mailto:\` se arma después de cargar la página, para
 * que no queden escritas en el HTML que recogen los rastreadores de spam. Por
 * eso no están en \`config.ts\`, que sí se importa desde el navegador.
 */
export const contacto = {
  general: ${q(c.general)},
  privacidad: ${q(c.privacidad)},
  patrocinios: ${q(c.patrocinios)},
};
`;
}

function envLocal(r) {
  return `# Generado por \`npm run setup\`. No se sube al repositorio.
# La lista completa de variables, con su explicación, está en .env.example.

NEXT_PUBLIC_APP_URL=${r.sitio}

# Base de datos. Vacía sirve para \`npm run demo\`; para el evento real, ver docs/base-de-datos.md.
MONGODB_URI=

# Firma de las sesiones del panel. Única por despliegue: no la compartas ni la reutilices.
JWT_SECRET=${randomBytes(48).toString("base64")}
`;
}

// ── Principal ────────────────────────────────────────────────────────────────

const desde = args.indexOf("--desde");
const respuestas = desde >= 0 ? JSON.parse(fs.readFileSync(path.resolve(args[desde + 1]), "utf8")) : await preguntar();

const errores = validar(respuestas);
if (errores.length) {
  console.error("\nNo se escribió nada. Hay que corregir:\n  - " + errores.join("\n  - "));
  process.exit(1);
}
respuestas.contacto ??= PLANTILLA.contacto;

fs.writeFileSync(path.join(raiz, "evento/config.ts"), configTs(respuestas));
fs.writeFileSync(path.join(raiz, "evento/contacto.ts"), contactoTs(respuestas.contacto));
const escritos = ["evento/config.ts", "evento/contacto.ts"];

const env = path.join(raiz, ".env.local");
if (!fs.existsSync(env)) {
  fs.writeFileSync(env, envLocal(respuestas));
  escritos.push(".env.local");
}

console.log(`
Listo. Se escribió: ${escritos.join(", ")}

Lo que sigue:
  1. npm run doctor     comprueba la configuración y dice qué falta
  2. npm run demo       levanta el sitio con una base en memoria, para verlo
  3. Edita el contenido en evento/: equipo.ts, keynotes.ts, patrocinadores.ts,
     comunidades.ts, grupos.ts, tracks.ts (y sus imágenes en public/evento/)
  4. docs/despliegue.md cuando quieras publicarlo
`);
