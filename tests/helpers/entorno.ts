import { createRequire } from "node:module";
import path from "node:path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";

/** Base en memoria + sesión de admin + peticiones, para llamar a los handlers de las rutas. */
const req = createRequire(import.meta.url);

let servidor: MongoMemoryServer | undefined;
let cookie = "";
let ip = 0;

// `cache()` de React solo deduplica con el despachador de Next; se monta uno de servidor.
function react19Servidor() {
  const reactDir = path.dirname(req.resolve("react/package.json"));
  const servidorReact = req(path.join(reactDir, "cjs/react.react-server.development.js"));
  let almacen: unknown;
  servidorReact.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.A = {
    getCacheForType: (f: () => unknown) => (almacen ??= f()),
    cacheSignal: () => null,
  };
  const cliente = req("react");
  req.cache[req.resolve("react")]!.exports = { ...cliente, cache: servidorReact.cache };
  return () => { almacen = undefined; };
}

/** Levanta Mongo en memoria y deja una sesión de admin válida. Devuelve `nuevaPeticion`. */
export async function montarEntorno(nombreDb: string, rol = "admin") {
  process.env.JWT_SECRET = "secreto-de-prueba";
  process.env.CORREO_PROVEEDOR = "consola";
  delete process.env.RESEND_API_KEY;
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri(nombreDb);
  const nuevaPeticion = react19Servidor();

  const headers = req("next/headers");
  Object.defineProperty(headers, "cookies", {
    value: async () => ({ get: (n: string) => (n === "cd-sesion" ? { value: cookie } : undefined) }),
    configurable: true,
  });

  const { connectDB } = await import("@/lib/db");
  const { signToken } = await import("@/lib/auth");
  const { User } = await import("@/models/user");
  const { Session } = await import("@/models/session");
  await connectDB();
  const sessionId = "sesion-flujos";
  const ins = await User.collection.insertOne({
    email: "admin@ejemplo.test", name: "Voluntaria Prueba", role: rol, currentSessionId: sessionId, permisos: [],
  });
  await Session.collection.insertOne({ userId: String(ins.insertedId), sessionId, expiresAt: new Date(Date.now() + 3600_000) });
  cookie = signToken({ userId: String(ins.insertedId), sessionId });
  return { nuevaPeticion };
}

export async function desmontarEntorno() {
  await mongoose.disconnect();
  await servidor?.stop();
}

/** Sin la cookie: lo que ve alguien que no ha iniciado sesión. */
export const sinSesion = () => { const antes = cookie; cookie = ""; return () => { cookie = antes; }; };

/** Petición JSON con una IP distinta cada vez, para no chocar con el límite de peticiones. */
export function peticion(url: string, cuerpo?: unknown, metodo = "POST", extra: Record<string, string> = {}) {
  return new NextRequest(`http://prueba.test${url}`, {
    method: metodo,
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${(++ip % 250) + 1}`, ...extra },
    ...(cuerpo === undefined ? {} : { body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) }),
  });
}

export const conParams = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

export const leer = async (r: Response) => ({ status: r.status, body: await r.json() as Record<string, unknown> });
