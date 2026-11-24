/**
 * Rellena el campo `busqueda` (el que usan las búsquedas del check-in y de los
 * escáneres) en los registros y pasaportes que ya existían.
 *
 *   node scripts/rellenar-busqueda.mjs         # en seco: sólo cuenta
 *   node scripts/rellenar-busqueda.mjs --aplicar
 *
 * Lee `MONGODB_URI` de `.env.local`. Es seguro repetirlo: sólo toca lo que no
 * tiene el campo.
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";

const CAMPOS = {
  registrations: ["firstName", "lastName", "email", "documentNumber", "qrCode"],
  passports: ["firstName", "lastName", "company", "shortId"],
};

// Misma regla que `palabrasDeBusqueda` de src/models/registration.ts (hay una prueba que lo vigila).
export function palabras(doc, campos) {
  const set = new Set();
  for (const c of campos) {
    const v = doc[c];
    if (typeof v !== "string" || !v.trim()) continue;
    const n = v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (const w of n.split(/\s+/)) {
      if (!w) continue;
      set.add(w);
      set.add(w.replace(/[^a-z0-9]/g, ""));
      for (const t of w.split(/[^a-z0-9]+/)) set.add(t);
    }
  }
  set.delete("");
  return [...set];
}

/** Rellena una conexión; devuelve cuántos documentos le faltaban por colección. */
export async function rellenar(conn, aplicar) {
  const salida = {};
  for (const [coleccion, campos] of Object.entries(CAMPOS)) {
    const col = conn.collection(coleccion);
    const falta = { busqueda: { $exists: false } };
    salida[coleccion] = await col.countDocuments(falta);
    if (!aplicar || !salida[coleccion]) continue;
    let lote = [];
    const volcar = async () => {
      if (lote.length) await col.bulkWrite(lote, { ordered: false });
      lote = [];
    };
    for await (const d of col.find(falta).project(Object.fromEntries(campos.map((c) => [c, 1])))) {
      lote.push({ updateOne: { filter: { _id: d._id }, update: { $set: { busqueda: palabras(d, campos) } } } });
      if (lote.length >= 500) await volcar();
    }
    await volcar();
  }
  return salida;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (!process.env.MONGODB_URI) {
    console.error("Falta MONGODB_URI");
    process.exit(1);
  }
  const aplicar = process.argv.includes("--aplicar");
  const conn = await mongoose.createConnection(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    const n = await rellenar(conn, aplicar);
    for (const [c, k] of Object.entries(n)) {
      console.log(`${c}: ${k} sin busqueda${aplicar ? " (rellenados)" : ""}`);
    }
    if (!aplicar) console.log("En seco: no se cambió nada. Añade --aplicar para rellenar.");
  } finally {
    await conn.close();
  }
}
