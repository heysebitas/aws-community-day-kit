import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";

/**
 * Toda ruta de `src/app/api/` debe estar clasificada: protegida (sin sesión → 401,
 * sin permiso → 403) o en la lista blanca de públicas, con su motivo.
 * Una ruta nueva sin clasificar hace fallar la prueba.
 */

const req = createRequire(import.meta.url);
const RAIZ = path.resolve(import.meta.dirname, "../src/app/api");
const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const LECTURA = new Set(["GET", "HEAD", "OPTIONS"]);

/** Métodos públicos: «MÉTODO /ruta» → motivo y la marca que debe aparecer en el fuente. */
const LIMITE = "rateLimit(";
const PUBLICAS: Record<string, { motivo: string; marca?: string }> = {
  "POST /auth/create-password": { motivo: "invitación", marca: LIMITE },
  "POST /auth/login": { motivo: "login", marca: LIMITE },
  "POST /auth/logout": { motivo: "logout", marca: "getAuthUser(" },
  "GET /auth/me": { motivo: "sesión" },
  "GET /auth/validate-token": { motivo: "invitación", marca: LIMITE },
  "POST /confirm-passport-edit/[token]": { motivo: "confirmación", marca: LIMITE },
  "GET /confirm/[token]": { motivo: "confirmación", marca: LIMITE },
  "POST /confirm/[token]": { motivo: "confirmación", marca: LIMITE },
  "GET /countdown": { motivo: "portada", marca: LIMITE },
  "GET /health": { motivo: "salud", marca: LIMITE },
  "GET /email-map": { motivo: "formulario", marca: LIMITE },
  "GET /agenda": { motivo: "sitio" },
  // GET público; con `?all=true` exige permiso (ver CONDICIONADAS).
  "GET /faq": { motivo: "sitio" },
  // GET público; los datos del equipo sólo se añaden con sesión de staff.
  "GET /event-config": { motivo: "sitio" },
  "GET /evento": { motivo: "datos" },
  "GET /rooms": { motivo: "sitio" },
  "GET /speaker-profiles": { motivo: "sitio" },
  "GET /speaker-profiles/[slug]": { motivo: "sitio" },
  // Respuesta fija 405 que remite a /enviar: no lee ni escribe nada.
  "POST /admin/campanas": { motivo: "inerte", marca: "status: 405" },
  "GET /forms/[formType]": { motivo: "formulario" },
  "GET /marca/[pieza]": { motivo: "imagen", marca: LIMITE },
  "GET /og/speaker/[slug]": { motivo: "imagen", marca: LIMITE },
  "GET /pass-qr/[code]": { motivo: "imagen" },
  "GET /passes/[qrCode]": { motivo: "pase", marca: LIMITE },
  "GET /passport/[shortId]": { motivo: "pasaporte", marca: "comprobarPin(" },
  "PATCH /passport/[shortId]": { motivo: "pasaporte", marca: "comprobarPin(" },
  // El PIN del stand hace de llave y los fallos se cuentan por IP y por pasaporte.
  "POST /passport/[shortId]/stamp": { motivo: "pin", marca: "isBlocked(" },
  "POST /passport/[shortId]/stats": { motivo: "pasaporte", marca: LIMITE },
  "POST /registrations": { motivo: "registro", marca: LIMITE },
  "GET /speaker-profiles/check-slug": { motivo: "formulario", marca: LIMITE },
  "POST /speakers": { motivo: "propuesta", marca: LIMITE },
  "POST /upload/public-presign": { motivo: "subida", marca: LIMITE },
  "POST /volunteers": { motivo: "postulación", marca: LIMITE },
  // Firma de Svix en lugar de límite: sin firma válida responde 401.
  "POST /webhooks/resend": { motivo: "webhook", marca: "wh.verify(" },
};

/** Públicas que con ciertos parámetros pasan a ser protegidas: la variante protegida también se prueba. */
const CONDICIONADAS: Record<string, string> = { "GET /faq": "?all=true" };

/** Valores válidos para segmentos que la ruta valida antes de nada. */
const PARAMS: Record<string, string> = { formType: "attendee" };

/**
 * Protegidas que dejan pasar a un organizador sin permisos por sección (sólo piden rol):
 * el 403 se prueba con la cuenta de rol «badges».
 */
const SOLO_ROL = new Set(["GET /settings", "GET /stats", "GET /stats/event", "POST /upload/presign"]);

/**
 * Rutas que rechazan con otro código que 401/403. Cada excepción lleva su motivo al lado.
 */
const CODIGOS: Record<string, { sinSesion?: number; sinPermiso?: number }> = {
  // Vacía: con `ruta()` y `AuthError` toda ruta protegida da 401 sin sesión y 403 sin permiso.
};

interface Entrada { ruta: string; archivo: string; fuente: string }

function rutas(dir = RAIZ, acc: Entrada[] = []): Entrada[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) rutas(p, acc);
    else if (/^route\.tsx?$/.test(e.name)) {
      acc.push({ ruta: "/" + path.relative(RAIZ, dir).split(path.sep).join("/"), archivo: p, fuente: fs.readFileSync(p, "utf8") });
    }
  }
  return acc.sort((a, b) => a.ruta.localeCompare(b.ruta));
}

const TABLA = rutas();
const llave = (m: string, r: string) => `${m} ${r}`;

let servidor: MongoMemoryServer;
let cookie = "";
let ip = 0;

before(async () => {
  process.env.JWT_SECRET = "secreto-de-prueba";
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri("permisosrutas");

  // `cache()` de React sólo deduplica con el despachador de Next: se usa el build de servidor.
  const reactDir = path.dirname(req.resolve("react/package.json"));
  const servidorReact = req(path.join(reactDir, "cjs/react.react-server.development.js"));
  let almacen: unknown;
  servidorReact.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.A = {
    getCacheForType: (f: () => unknown) => (almacen ??= f()),
    cacheSignal: () => null,
  };
  const cliente = req("react");
  req.cache[req.resolve("react")]!.exports = { ...cliente, cache: servidorReact.cache };
  const reiniciar = () => { almacen = undefined; };

  const headers = req("next/headers");
  Object.defineProperty(headers, "cookies", {
    value: async () => { reiniciar(); return { get: (n: string) => (n === "cd-sesion" ? { value: cookie } : undefined), set() {}, delete() {} }; },
    configurable: true,
  });

  const { connectDB } = await import("@/lib/db");
  await connectDB();
});

after(async () => {
  await mongoose.disconnect();
  await servidor?.stop();
});

/** Crea una cuenta con sesión viva y devuelve su cookie. */
async function sesion(email: string, role: string, permisos: unknown[]) {
  const { signToken } = await import("@/lib/auth");
  const { User } = await import("@/models/user");
  const { Session } = await import("@/models/session");
  const sessionId = `sesion-${email}`;
  const ins = await User.collection.insertOne({ email, name: "Cuenta Prueba", role, currentSessionId: sessionId, permisos });
  await Session.collection.insertOne({ userId: String(ins.insertedId), sessionId, expiresAt: new Date(Date.now() + 3600_000) });
  return signToken({ userId: String(ins.insertedId), sessionId });
}

type Manejador = (r: NextRequest, c: { params: Promise<Record<string, string>> }) => Promise<Response>;

async function llamar(e: Entrada, metodo: string, consulta = "") {
  const mod = (await import(e.archivo)) as Record<string, Manejador>;
  const params: Record<string, string> = {};
  const valor = (n: string) => PARAMS[n] ?? "000000000000000000000000";
  for (const m of e.ruta.matchAll(/\[(\w+)\]/g)) params[m[1]!] = valor(m[1]!);
  const url = "http://prueba.test/api" + e.ruta.replace(/\[(\w+)\]/g, (_, n) => valor(n)) + consulta;
  // Cuerpo vacío válido: varias rutas leen el JSON antes de comprobar la sesión.
  const r = new NextRequest(url, {
    method: metodo,
    headers: { "x-forwarded-for": `203.0.113.${++ip % 250}`, "content-type": "application/json" },
    ...(metodo === "GET" ? {} : { body: "{}" }),
  });
  return mod[metodo]!(r, { params: Promise.resolve(params) });
}

async function metodosDe(e: Entrada) {
  const mod = (await import(e.archivo)) as Record<string, unknown>;
  return METODOS.filter((m) => typeof mod[m] === "function");
}

describe("clasificación de rutas", () => {
  test("cada ruta exporta al menos un método reconocido", async () => {
    assert.ok(TABLA.length > 0);
    for (const e of TABLA) assert.ok((await metodosDe(e)).length > 0, `${e.ruta} no exporta GET/POST/PUT/PATCH/DELETE`);
  });

  test("toda entrada de la lista blanca apunta a una ruta y método que existen", async () => {
    const existentes = new Set<string>();
    for (const e of TABLA) for (const m of await metodosDe(e)) existentes.add(llave(m, e.ruta));
    for (const k of Object.keys(PUBLICAS)) assert.ok(existentes.has(k), `«${k}» está en la lista blanca pero la ruta ya no existe`);
    for (const k of [...SOLO_ROL, ...Object.keys(CODIGOS), ...Object.keys(CONDICIONADAS)]) assert.ok(existentes.has(k), `«${k}» sobra en las tablas de excepciones`);
  });

  test("las públicas que escriben declaran su límite en el fuente", () => {
    for (const [k, v] of Object.entries(PUBLICAS)) {
      const [metodo, ruta] = k.split(" ");
      const e = TABLA.find((x) => x.ruta === ruta)!;
      if (LECTURA.has(metodo!) && !v.marca) continue;
      if (!LECTURA.has(metodo!)) assert.ok(v.marca, `«${k}» escribe y es pública: debe declarar límite`);
      assert.ok(e.fuente.includes(v.marca!), `«${k}» no contiene ${v.marca}`);
    }
  });

  test("las protegidas piden sesión en el fuente", async () => {
    for (const e of TABLA) {
      const protegidos = (await metodosDe(e)).filter((m) => !PUBLICAS[llave(m, e.ruta)]);
      if (protegidos.length) assert.match(e.fuente, /\brequire(Auth|Access|Delete|AnyAccess)\b|\bguard/, `${e.ruta} no llama a requireAuth/requireAccess`);
    }
  });
});

describe("permisos por ruta", () => {
  const cookies: Record<string, string> = {};
  before(async () => {
    // Organizador con todas las secciones en «no»: entra por rol pero no por permiso.
    const { permisosVacios } = await import("@/lib/permisos");
    cookies.sinPermiso = await sesion("sin-permiso@ejemplo.test", "organizer", permisosVacios());
    cookies.badges = await sesion("badges@ejemplo.test", "badges", []);
  });

  const estado = async (e: Entrada, m: string, quien: string, consulta = "") => {
    cookie = quien;
    return (await llamar(e, m, consulta).catch((x) => ({ status: `lanzó ${x}` }))).status;
  };

  test("sin sesión → 401 y con un rol sin permiso → 403 en cada método protegido", async () => {
    const fallos: string[] = [];
    for (const e of TABLA) {
      for (const m of await metodosDe(e)) {
        const k = llave(m, e.ruta);
        const variantes = PUBLICAS[k] ? (CONDICIONADAS[k] ? [CONDICIONADAS[k]] : []) : [""];
        for (const q of variantes) {
          const esperado = CODIGOS[k] ?? {};
          const sin = await estado(e, m, "", q);
          if (sin !== (esperado.sinSesion ?? 401)) fallos.push(`${k}${q}: sin sesión dio ${sin}`);
          const actor = SOLO_ROL.has(k) ? "badges" : "sinPermiso";
          const r = await estado(e, m, cookies[actor]!, q);
          if (r !== (esperado.sinPermiso ?? 403)) fallos.push(`${k}${q}: ${actor} dio ${r}`);
        }
      }
    }
    assert.deepEqual(fallos, []);
  });
});
