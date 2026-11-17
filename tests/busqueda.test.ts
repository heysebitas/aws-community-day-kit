import { test, describe, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";

// 5 000 registros en una base real en memoria: el plan de consulta y el tiempo
// sólo significan algo contra Mongo de verdad.
const req = createRequire(import.meta.url);
let servidor: MongoMemoryServer;
let cookie = "";

const NOMBRES = ["Ana", "José", "María", "Luis", "Carla", "Pedro", "Lucía", "Andrés", "Sofía", "Diego"];
const APELLIDOS = ["Pérez", "Gómez", "Rodríguez", "Núñez", "Álvarez", "Torres", "Ramírez", "Castillo"];

const get = (url: string) => new NextRequest(`http://prueba.test${url}`, { headers: { "x-forwarded-for": "203.0.113.9" } });
const buscar = async (ruta: "check-in" | "scanner", q: string) => {
  const { GET } = ruta === "check-in"
    ? await import("@/app/api/check-in/search/route")
    : await import("@/app/api/scanner/search/route");
  const r = await GET(get(`/api/${ruta}/search?q=${encodeURIComponent(q)}`));
  assert.equal(r.status, 200);
  return ((await r.json()) as { results: Record<string, unknown>[] }).results;
};

before(async () => {
  process.env.JWT_SECRET = "secreto-de-prueba";
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri("busqueda");

  const headers = req("next/headers");
  Object.defineProperty(headers, "cookies", {
    value: async () => ({ get: (n: string) => (n === "cd-sesion" ? { value: cookie } : undefined) }),
    configurable: true,
  });

  const { connectDB } = await import("@/lib/db");
  const { signToken } = await import("@/lib/auth");
  const { User } = await import("@/models/user");
  const { Session } = await import("@/models/session");
  const { Registration } = await import("@/models/registration");
  const { Passport } = await import("@/models/passport");
  await connectDB();
  await Promise.all([Registration.init(), Passport.init()]);
  const ins = await User.collection.insertOne({
    email: "admin@ejemplo.test", name: "Voluntaria Prueba", role: "admin", currentSessionId: "s1", permisos: [],
  });
  await Session.collection.insertOne({ userId: String(ins.insertedId), sessionId: "s1", expiresAt: new Date(Date.now() + 3600_000) });
  cookie = signToken({ userId: String(ins.insertedId), sessionId: "s1" });

  // Por `create` para que corra el hook; en bloques para no tardar.
  const docs = Array.from({ length: 5000 }, (_, i) => ({
    firstName: NOMBRES[i % NOMBRES.length],
    lastName: `${APELLIDOS[i % APELLIDOS.length]} ${i}`,
    email: `persona${i}@ejemplo.test`,
    attendance: "in-person" as const,
    documentNumber: String(10_000_000 + i),
    role: "student",
    entityType: "university",
    qrCode: `qr-${i}`,
    createdAt: new Date(Date.UTC(2026, 0, 1) + i * 1000),
  }));
  await Registration.insertMany(docs);
  const regs = await Registration.find({}).select("_id firstName lastName qrCode").lean();
  await Passport.insertMany(regs.map((r) => ({
    shortId: r.qrCode, role: "attendee", firstName: r.firstName, lastName: r.lastName, linkedRegistrationId: String(r._id),
  })));
});

after(async () => {
  mock.restoreAll();
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
  await servidor?.stop();
});

describe("búsqueda indexada", () => {
  test("encuentra por nombre, apellido, correo y documento sin tildes ni mayúsculas", async () => {
    for (const q of ["JOSE", "jose", "José", "nunez 7", "NÚÑEZ 7", "persona42@ejemplo", "PERSONA42@EJEMPLO.TEST", "10000042", "qr-42"]) {
      const r = await buscar("check-in", q);
      assert.ok(r.length > 0 && r.length <= 25, `check-in "${q}": ${r.length}`);
    }
    const r = await buscar("check-in", "10000042");
    assert.deepEqual(r.map((x) => x.email), ["persona42@ejemplo.test"]);
    const j = await buscar("check-in", "maria alvarez 5");
    assert.ok(j.every((x) => /maría/i.test(String(x.name)) && /álvarez/i.test(String(x.name))));
  });

  test("el escáner encuentra por nombre, por documento y por correo del registro", async () => {
    assert.ok((await buscar("scanner", "andres")).length > 0);
    const porDoc = await buscar("scanner", "10000042");
    assert.deepEqual(porDoc.map((x) => x.shortId), ["qr-42"]);
    assert.deepEqual((await buscar("scanner", "PERSONA43@ejemplo")).map((x) => x.shortId), ["qr-43"]);
  });

  test("nunca más de 25 resultados", async () => {
    assert.equal((await buscar("check-in", "ana")).length, 25);
    assert.equal((await buscar("scanner", "ana")).length, 25);
  });

  test("ninguna búsqueda hace find({}) y el plan es IXSCAN", async () => {
    const { Registration } = await import("@/models/registration");
    const { Passport } = await import("@/models/passport");
    const vistos: unknown[] = [];
    for (const M of [Registration, Passport] as const) {
      const orig = M.find.bind(M);
      mock.method(M, "find", (...a: unknown[]) => { vistos.push(a[0]); return (orig as (...x: unknown[]) => unknown)(...a); });
    }
    await buscar("check-in", "ana");
    await buscar("scanner", "ana");
    mock.restoreAll();
    assert.equal(vistos.length, 3);
    for (const f of vistos) assert.ok(f && Object.keys(f as object).length > 0, "find sin filtro");

    const { filtroDeBusqueda } = await import("@/models/registration");
    const filtro = filtroDeBusqueda("jose nunez")!;
    for (const [nombre, M] of [["registrations", Registration], ["passports", Passport]] as const) {
      const plan = JSON.stringify(await M.find(filtro as never).limit(25).explain("executionStats"));
      assert.match(plan, /IXSCAN/, nombre);
      assert.doesNotMatch(plan, /COLLSCAN/, nombre);
      const stats = (JSON.parse(plan) as { executionStats: { totalDocsExamined: number } }).executionStats;
      // Con dos palabras el índice acota por la primera y la segunda filtra: lejos de los 5 000.
      assert.ok(stats.totalDocsExamined <= 500, `${nombre} examinó ${stats.totalDocsExamined}`);
      console.log(`explain ${nombre}: ${stats.totalDocsExamined} documentos examinados (find({}) examinaba toda la colección)`);
    }
  });

  test("p95 de 50 búsquedas < 300 ms", async () => {
    const consultas = ["ana", "jose", "nunez", "persona1", "1000", "maria g", "luis p", "qr-3", "carla", "sofia"];
    const ms: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t = performance.now();
      await buscar(i % 2 ? "check-in" : "scanner", consultas[i % consultas.length]!);
      ms.push(performance.now() - t);
    }
    ms.sort((a, b) => a - b);
    const p95 = ms[Math.ceil(ms.length * 0.95) - 1];
    console.log(`p95 de 50 búsquedas con 5000 registros: ${p95!.toFixed(1)} ms (mediana ${ms[24]!.toFixed(1)} ms)`);
    assert.ok(p95! < 300, `p95 ${p95} ms`);
  });
});

describe("el campo se mantiene en las escrituras", () => {
  test("save, updateOne, findOneAndUpdate y upsert", async () => {
    const { Registration } = await import("@/models/registration");
    const { Passport } = await import("@/models/passport");

    const r = await Registration.create({
      firstName: "Zoe", lastName: "Quispe", email: "zoe@ejemplo.test", attendance: "in-person",
      role: "student", entityType: "university", qrCode: "qr-zoe",
    });
    assert.equal((await buscar("check-in", "quispe")).length, 1);

    r.lastName = "Mamani";
    await r.save();
    assert.equal((await buscar("check-in", "quispe")).length, 0);
    assert.equal((await buscar("check-in", "mamani")).length, 1);

    await Registration.updateOne({ _id: r._id }, { $set: { documentNumber: "99887766" } });
    assert.equal((await buscar("check-in", "99887766")).length, 1);
    assert.equal((await buscar("check-in", "mamani")).length, 1, "conserva lo anterior");

    await Registration.findOneAndUpdate({ _id: r._id }, { email: "zoe.nueva@ejemplo.test" });
    assert.equal((await buscar("check-in", "zoe.nueva@")).length, 1);
    assert.equal((await buscar("check-in", "zoe@ejemplo")).length, 0);

    // Una escritura que no toca esos campos no altera la búsqueda.
    await Registration.updateOne({ _id: r._id }, { $set: { checkedIn: true } });
    assert.equal((await buscar("check-in", "mamani")).length, 1);

    await assert.rejects(Registration.updateMany({}, { $set: { firstName: "X" } }), /updateOne/);

    // Alta por upsert, como hace la generación de pasaportes.
    await Passport.updateOne(
      { shortId: "pas-nuevo" },
      { $setOnInsert: { shortId: "pas-nuevo", role: "attendee", firstName: "Ñandú", lastName: "Rivas", company: "Acme" } },
      { upsert: true },
    );
    assert.deepEqual((await buscar("scanner", "nandu")).map((x) => x.shortId), ["pas-nuevo"]);
    await Passport.findOneAndUpdate({ shortId: "pas-nuevo" }, { $set: { lastName: "Soto" } });
    assert.equal((await buscar("scanner", "rivas")).length, 0);
    assert.equal((await buscar("scanner", "nandu soto")).length, 1);
  });

  test("el script de relleno coincide con el modelo y respeta el modo en seco", async () => {
    const { Registration, palabrasDeBusqueda } = await import("@/models/registration");
    const { palabras, rellenar } = (await import("../scripts/rellenar-busqueda.mjs")) as unknown as {
      palabras: (d: object, c: string[]) => string[];
      rellenar: (c: unknown, a: boolean) => Promise<{ registrations: number }>;
    };
    const doc = { firstName: "Álvaro", lastName: "Ñ-Pérez", email: "a.b@x.test", documentNumber: "12.345-6", qrCode: "Ab_c" };
    assert.deepEqual(palabras(doc, ["firstName", "lastName", "email", "documentNumber", "qrCode"]).sort(), palabrasDeBusqueda(doc).sort());

    await Registration.collection.insertOne({ firstName: "Viejo", lastName: "Sinindice", email: "viejo@ejemplo.test", qrCode: "qr-viejo", createdAt: new Date() });
    const conn = Registration.db;
    assert.equal((await rellenar(conn, false)).registrations, 1);
    assert.equal((await buscar("check-in", "sinindice")).length, 0, "en seco no cambia nada");
    await rellenar(conn, true);
    assert.equal((await buscar("check-in", "sinindice")).length, 1);
    assert.equal((await rellenar(conn, false)).registrations, 0);
  });
});

describe("GET /api/registrations", () => {
  test("pagina por cursor con objetos planos y sin repetir ni perder filas", async () => {
    const { GET } = await import("@/app/api/registrations/route");
    const vistos: string[] = [];
    let cursor: string | null = null;
    let paginas = 0;
    do {
      const r: Response = await GET(get(`/api/registrations?limit=500${cursor ? `&cursor=${cursor}` : ""}`));
      assert.equal(r.status, 200);
      const d = (await r.json()) as { registrations: Record<string, unknown>[]; nextCursor: string | null };
      assert.ok(d.registrations.length <= 500);
      for (const x of d.registrations) {
        assert.ok(!("busqueda" in x) && !("__v" in x));
        vistos.push(String(x._id));
      }
      cursor = d.nextCursor;
      paginas++;
    } while (cursor);
    assert.ok(paginas >= 10);
    assert.equal(new Set(vistos).size, vistos.length);
    const { Registration } = await import("@/models/registration");
    assert.equal(vistos.length, await Registration.countDocuments({}));

    const mala = await GET(get("/api/registrations?cursor=basura"));
    assert.equal(mala.status, 400);
  });
});
