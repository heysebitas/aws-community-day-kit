import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { enviarPorTramos, conConcurrencia, type SendEmailOptions } from "@/lib/correo";
import { registrarTramo } from "@/models/envios-masivos";
import { tomarCerrojo, soltarCerrojo } from "@/models/email-cerrojo";
import { EmailEnvio } from "@/models/email-envio";
import { Registration } from "@/models/registration";
import { CAMPO_ENVIADOS, type Destinatario } from "@/lib/audiencias-servidor";

/** Envíos masivos: registro por tramos, cerrojo, certificados y aprobación. */

process.env.CORREO_PROVEEDOR = "consola";
const log = console.log;

let servidor: MongoMemoryServer;
before(async () => {
  console.log = () => {};
  servidor = await MongoMemoryServer.create();
  await mongoose.connect(servidor.getUri("envios-masivos"));
});
after(async () => {
  console.log = log;
  await mongoose.disconnect();
  await servidor.stop();
});
beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

const SLUG_CAMPANA = "recordatorio";

async function crearGente(n: number): Promise<Destinatario[]> {
  const docs = Array.from({ length: n }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(), email: `persona${i}@ejemplo.test`,
  }));
  await Registration.collection.insertMany(docs);
  return docs.map((d, i) => ({
    email: d.email, nombre: `Persona ${i}`, publico: "asistentes" as const,
    id: String(d._id), valores: {}, banderas: [],
  }));
}

const correosDe = (gente: Destinatario[]): SendEmailOptions[] =>
  gente.map((d) => ({ from: "x@ejemplo.test", to: d.email, subject: "Hola", html: "<p>hola</p>" }));

/** Los que aún no tienen la marca de la campaña: lo que un reintento volvería a mandar. */
const pendientes = async () =>
  Registration.collection.countDocuments({ [CAMPO_ENVIADOS.asistentes]: { $ne: SLUG_CAMPANA } });

async function enviar(gente: Destinatario[], cortarEn?: number) {
  const campana = new mongoose.Types.ObjectId();
  return enviarPorTramos(correosDe(gente), 50, async (inicio, resultados) => {
    // Cortar aquí equivale a morir con ese tramo enviado y sin anotar.
    if (inicio === cortarEn) throw new Error("corte");
    await registrarTramo({
      campana, plantilla: SLUG_CAMPANA,
      gente: gente.slice(inicio, inicio + resultados.length), resultados,
    });
  });
}

describe("campañas por tramos", () => {
  test("un corte a mitad deja anotado lo de los tramos anteriores y el reintento no lo reenvía", async () => {
    const gente = await crearGente(120);
    await assert.rejects(enviar(gente, 50), /corte/);

    assert.equal(await EmailEnvio.countDocuments({ estado: "enviado" }), 50);
    assert.equal(await pendientes(), 70);

    // El reintento sólo toma a quien no tiene la marca.
    const restantes = gente;
    const sinMarca = await Registration.collection
      .find({ [CAMPO_ENVIADOS.asistentes]: { $ne: SLUG_CAMPANA } }).toArray();
    const ids = new Set(sinMarca.map((d) => String(d._id)));
    const reintento = restantes.filter((d) => ids.has(d.id));
    assert.equal(reintento.length, 70);
    assert.ok(!reintento.some((d) => d.email === "persona0@ejemplo.test"));

    await enviar(reintento);
    assert.equal(await pendientes(), 0);
    assert.equal(await EmailEnvio.countDocuments({ estado: "enviado", email: "persona0@ejemplo.test" }), 1);
  });

  test("un fallo de envío no marca a esa persona", async () => {
    const gente = await crearGente(3);
    await registrarTramo({
      campana: new mongoose.Types.ObjectId(), plantilla: SLUG_CAMPANA, gente,
      resultados: [{ id: "a", error: null }, { id: null, error: "429" }, { id: "c", error: null }],
    });
    assert.equal(await pendientes(), 1);
    assert.equal(await EmailEnvio.countDocuments({ estado: "fallido" }), 1);
  });

  test("el límite de tiempo detiene los tramos y dice cuántos se hicieron", async () => {
    const gente = await crearGente(120);
    const hechos = await enviarPorTramos(correosDe(gente), 50, async () => {}, -1);
    assert.equal(hechos, 0);
  });
});

describe("cerrojo por campaña", () => {
  test("dos peticiones a la vez: sólo una lo toma", async () => {
    const r = await Promise.all([tomarCerrojo("campana:a", "uno"), tomarCerrojo("campana:a", "dos")]);
    assert.deepEqual(r.slice().sort(), [false, true]);
  });

  test("otra plantilla no queda bloqueada, y soltar lo libera", async () => {
    assert.equal(await tomarCerrojo("campana:a", "uno"), true);
    assert.equal(await tomarCerrojo("campana:b", "uno"), true);
    assert.equal(await tomarCerrojo("campana:a", "dos"), false);
    await soltarCerrojo("campana:a");
    assert.equal(await tomarCerrojo("campana:a", "dos"), true);
  });

  test("uno caducado se puede tomar", async () => {
    assert.equal(await tomarCerrojo("campana:a", "uno", -1000), true);
    assert.equal(await tomarCerrojo("campana:a", "dos"), true);
  });

  test("la ruta responde 409 cuando no consigue el cerrojo, antes de resolver la audiencia", () => {
    const src = readFileSync("src/app/api/admin/campanas/enviar/route.ts", "utf8");
    const toma = src.indexOf("tomarCerrojo(");
    assert.ok(toma > 0 && src.indexOf("status: 409", toma) > toma);
    assert.ok(toma < src.indexOf("resolverAudiencia(audiencia"));
    assert.match(src, /finally\s*{[^}]*soltarCerrojo/);
  });
});

describe("certificados", () => {
  const src = readFileSync("src/app/api/admin/certificates/send/route.ts", "utf8");
  test("declara maxDuration y un tope de ids", () => {
    assert.match(src, /export const maxDuration = \d+/);
    assert.match(src, /ids\.length > TOPE_IDS/);
  });
  test("marca certSentAt uno a uno, sin updateMany al final", () => {
    assert.match(src, /updateOne\(\s*{ _id: v\._id }/);
    assert.ok(!src.includes("updateMany"));
  });
});

describe("aprobación masiva", () => {
  test("nunca más de 2 en paralelo y respeta el orden de los resultados", async () => {
    let activos = 0, maximo = 0;
    const r = await conConcurrencia([1, 2, 3, 4, 5, 6, 7], 2, async (n) => {
      maximo = Math.max(maximo, ++activos);
      await new Promise((ok) => setTimeout(ok, 5));
      activos--;
      return n * 2;
    });
    assert.equal(maximo, 2);
    assert.deepEqual(r.map((x) => (x.status === "fulfilled" ? x.value : null)), [2, 4, 6, 8, 10, 12, 14]);
  });

  test("un fallo no frena a los demás y queda como rechazado", async () => {
    const r = await conConcurrencia([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("429");
      return n;
    });
    assert.deepEqual(r.map((x) => x.status), ["fulfilled", "rejected", "fulfilled"]);
  });

  test("la ruta guarda el estado aceptado después de mandar el correo y exige que salga", () => {
    const src = readFileSync("src/app/api/speakers/bulk-approve/route.ts", "utf8");
    const envio = src.indexOf("await sendEmail(");
    assert.ok(envio > 0);
    assert.ok(src.indexOf("if (res.error) throw", envio) > envio);
    assert.ok(src.indexOf('profile.status = "accepted"') > src.indexOf("if (res.error) throw"));
    assert.match(src, /conConcurrencia\(ids, CONCURRENCIA/);
    assert.match(src, /CONCURRENCIA = 2/);
  });
});
