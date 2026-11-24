/**
 * Separa los identificadores del pasaporte (ver docs/despliegue.md).
 *
 *   node scripts/migrar-pasaporte.mjs --dry-run   # sólo cuenta
 *   node scripts/migrar-pasaporte.mjs             # aplica
 *
 * Antes el `shortId` del pasaporte era el `qrCode` del registro: quien veía un
 * pasaporte compartido tenía la llave del pase y de la confirmación. Esto:
 *  - da a cada pasaporte un `shortId` nuevo y aleatorio y guarda el viejo en
 *    `shortIdAnterior` (la página vieja redirige al nuevo hasta el fin del evento);
 *  - da a cada registro un `tokenConfirmacion` (los enlaces ya enviados siguen
 *    valiendo hasta el fin del evento);
 *  - arrastra el `shortId` nuevo a la búsqueda y a los cambios de pasaporte pendientes.
 *
 * Es seguro repetirlo: sólo toca lo que todavía está sin separar.
 * Lee `MONGODB_URI` de `.env.local`.
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { palabras } from "./rellenar-busqueda.mjs";

const CAMPOS_PASAPORTE = ["firstName", "lastName", "company", "shortId"];

/** Migra una conexión; devuelve cuánto cambió (o cambiaría con `dryRun`). */
export async function migrar(conn, { dryRun = false } = {}) {
  const regs = conn.collection("registrations");
  const pasaportes = conn.collection("passports");
  const cambios = conn.collection("passportedittokens");
  const salida = { tokensConfirmacion: 0, shortIds: 0, cambiosPendientes: 0 };

  // 1. Token de confirmación para quien no lo tiene.
  const sinToken = { tokenConfirmacion: { $exists: false } };
  salida.tokensConfirmacion = await regs.countDocuments(sinToken);
  if (!dryRun) {
    for await (const r of regs.find(sinToken).project({ _id: 1 })) {
      await regs.updateOne({ _id: r._id, ...sinToken }, { $set: { tokenConfirmacion: nanoid(21) } });
    }
  }

  // 2. shortId nuevo para los pasaportes cuyo shortId todavía es el qrCode del registro.
  const codigos = new Set();
  for await (const r of regs.find({ qrCode: { $type: "string" } }).project({ qrCode: 1 })) codigos.add(r.qrCode);

  const pendientes = [];
  for await (const p of pasaportes.find({ shortIdAnterior: { $exists: false } }).project({ shortId: 1, firstName: 1, lastName: 1, company: 1 })) {
    if (codigos.has(p.shortId)) pendientes.push(p);
  }
  salida.shortIds = pendientes.length;

  for (const p of pendientes) {
    const nuevo = nanoid(10);
    if (dryRun) {
      salida.cambiosPendientes += await cambios.countDocuments({ shortId: p.shortId });
      continue;
    }
    const r = await pasaportes.updateOne(
      { _id: p._id, shortId: p.shortId, shortIdAnterior: { $exists: false } },
      { $set: { shortId: nuevo, shortIdAnterior: p.shortId, busqueda: palabras({ ...p, shortId: nuevo }, CAMPOS_PASAPORTE) } },
    );
    if (r.modifiedCount) {
      const c = await cambios.updateMany({ shortId: p.shortId }, { $set: { shortId: nuevo } });
      salida.cambiosPendientes += c.modifiedCount;
    }
  }
  return salida;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (!process.env.MONGODB_URI) {
    console.error("Falta MONGODB_URI");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const conn = await mongoose.createConnection(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    const n = await migrar(conn, { dryRun });
    const verbo = dryRun ? "por cambiar" : "cambiados";
    console.log(`registros sin tokenConfirmacion ${verbo}: ${n.tokensConfirmacion}`);
    console.log(`pasaportes con shortId viejo ${verbo}: ${n.shortIds}`);
    console.log(`cambios de pasaporte pendientes ${verbo}: ${n.cambiosPendientes}`);
    if (dryRun) console.log("(en seco: no se escribió nada)");
  } finally {
    await conn.close();
  }
}
