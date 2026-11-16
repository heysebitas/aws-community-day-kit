import "server-only";
import mongoose from "mongoose";
import { DEMO } from "@/lib/env";

/**
 * La conexión a la base.
 *
 * Sirve cualquier base que hable el protocolo de MongoDB: Atlas, un Mongo
 * propio, Amazon DocumentDB o FerretDB sobre PostgreSQL. Las diferencias entre
 * ellas se resuelven acá y en la URI; el resto del código no se entera.
 * Ver `docs/base-de-datos.md`.
 */

interface Cache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  /** El servidor en memoria del modo demo, para no levantar dos. */
  demoUri?: Promise<string>;
}

const g = globalThis as unknown as { mongooseCache?: Cache };
const cache = (g.mongooseCache ??= { conn: null, promise: null });

async function uriDemo(): Promise<string> {
  cache.demoUri ??= (async () => {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const servidor = await MongoMemoryServer.create({ instance: { dbName: "community-day" } });
    console.warn("[db] MODO_DEMO: base en memoria. Los datos se pierden al apagar el servidor.");
    return servidor.getUri("community-day");
  })();
  return cache.demoUri;
}

function opciones(uri: string): mongoose.ConnectOptions {
  const o: mongoose.ConnectOptions = {
    // Bajo a propósito: en serverless cada instancia abre su propio pool y un
    // pico de tráfico agota las conexiones de la base antes que la CPU.
    maxPoolSize: Number(process.env.MONGODB_POOL) || 10,
    // Sin esto Mongo espera 30 s antes de fallar y el formulario se queda girando.
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS) || 5000,
  };
  // DocumentDB no admite escrituras reintentables y exige el CA de Amazon.
  if (/\.docdb\.amazonaws\.com/.test(uri)) o.retryWrites = false;
  if (process.env.MONGODB_CA_FILE) {
    o.tls = true;
    o.tlsCAFile = process.env.MONGODB_CA_FILE;
  }
  return o;
}

async function conectar(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || (DEMO ? await uriDemo() : "");
  if (!uri) throw new Error("MONGODB_URI no está definida. Copia .env.example a .env.local, o corre `npm run demo`.");

  const conn = await mongoose.connect(uri, opciones(uri));
  if (DEMO && !process.env.MONGODB_URI) {
    const { sembrarDemo } = await import("@/lib/demo");
    await sembrarDemo();
  }
  return conn;
}

export async function connectDB() {
  if (cache.conn) return cache.conn;
  cache.promise ??= conectar();

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (e) {
    // Una promesa rechazada no se queda en caché: si la base no respondió en el
    // arranque, el siguiente intento vuelve a conectar en vez de repetir el fallo.
    cache.promise = null;
    throw e;
  }
}
