import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";

// Operaciones de base y detalles del backend, contados contra una base real en memoria.
const req = createRequire(import.meta.url);
let servidor: MongoMemoryServer;
let cookie = "";

const post = (url: string, body: unknown) =>
  new NextRequest(`http://prueba.test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: JSON.stringify(body),
  });

before(async () => {
  process.env.JWT_SECRET = "secreto-de-prueba";
  delete process.env.TURNSTILE_SECRET_KEY;
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri("bulk");

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
  const sessionId = "sesion-1";
  const ins = await User.collection.insertOne({
    email: "admin@ejemplo.test", name: "Voluntaria Prueba", role: "admin", currentSessionId: sessionId, permisos: [],
  });
  await Session.collection.insertOne({
    userId: String(ins.insertedId), sessionId, expiresAt: new Date(Date.now() + 3600_000),
  });
  cookie = signToken({ userId: String(ins.insertedId), sessionId });
});

after(async () => {
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
  await servidor?.stop();
});

describe("passports/generate", () => {
  test("1 200 personas: como mucho 3 bulkWrite y los mismos campos", async () => {
    const { Registration } = await import("@/models/registration");
    const { Passport } = await import("@/models/passport");
    const N = 1200;
    await Registration.collection.insertMany(
      Array.from({ length: N }, (_, i) => ({
        firstName: i === 0 ? "" : `Nombre${i}`, lastName: `Apellido${i}`, email: `p${i}@ejemplo.test`,
        qrCode: `QR-${i}`, entityName: i % 2 ? `Entidad${i}` : null, role: "student",
      })),
    );
    // Uno ya existente sin PIN y uno manual que no se debe tocar (falla por duplicado, como antes).
    await Passport.collection.insertMany([
      { shortId: "QR-1", role: "attendee", firstName: "Viejo", viewPin: null, isManual: false },
      { shortId: "QR-2", role: "attendee", firstName: "Manual", viewPin: "1234", isManual: true },
    ]);

    let llamadas = 0;
    const original = Passport.bulkWrite.bind(Passport);
    (Passport as unknown as { bulkWrite: unknown }).bulkWrite = (...a: Parameters<typeof original>) => { llamadas++; return original(...a); };
    const updateOne = Passport.updateOne.bind(Passport);
    let sueltos = 0;
    (Passport as unknown as { updateOne: unknown }).updateOne = (...a: Parameters<typeof updateOne>) => { sueltos++; return updateOne(...a); };

    const { POST } = await import("@/app/api/admin/passports/generate/route");
    const r = await POST(post("/api/admin/passports/generate", { role: "attendee" }));
    (Passport as unknown as { bulkWrite: unknown }).bulkWrite = original;
    (Passport as unknown as { updateOne: unknown }).updateOne = updateOne;
    const body = await r.json();

    assert.equal(r.status, 200);
    assert.ok(llamadas >= 1 && llamadas <= 3, `bulkWrite: ${llamadas}`);
    assert.equal(sueltos, 0);
    assert.deepEqual(body, { ok: true, created: N - 2, skipped: 1, failed: 1 });
    assert.equal(await Passport.countDocuments({}), N);

    const p5 = await Passport.findOne({ shortId: "QR-5" }).lean();
    assert.equal(p5?.firstName, "Nombre5");
    assert.equal(p5?.lastName, "Apellido5");
    assert.equal(p5?.company, "Entidad5");
    assert.equal(p5?.role, "attendee");
    assert.equal(p5?.isManual, false);
    assert.match(p5?.viewPin ?? "", /^\d{4}$/);
    assert.ok(p5?.linkedRegistrationId);
    assert.equal((await Passport.findOne({ shortId: "QR-0" }).lean())?.firstName, "Sin");

    const viejo = await Passport.findOne({ shortId: "QR-1" }).lean();
    assert.equal(viejo?.firstName, "Nombre1");
    assert.match(viejo?.viewPin ?? "", /^\d{4}$/);
    const manual = await Passport.findOne({ shortId: "QR-2" }).lean();
    assert.equal(manual?.firstName, "Manual");
    assert.equal(manual?.viewPin, "1234");

    // Repetir no crea nada ni cambia los PIN.
    const r2 = await POST(post("/api/admin/passports/generate", { role: "attendee" }));
    assert.deepEqual(await r2.json(), { ok: true, created: 0, skipped: N - 1, failed: 1 });
    assert.equal((await Passport.findOne({ shortId: "QR-5" }).lean())?.viewPin, p5?.viewPin);
  });
});

describe("badges-pdf", () => {
  test("más de 200 shortIds responde 400 con mensaje", async () => {
    const { POST } = await import("@/app/api/print/badges-pdf/route");
    const r = await POST(post("/api/print/badges-pdf", { shortIds: Array.from({ length: 201 }, (_, i) => `QR-${i}`) }));
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /200/);
  });
});

describe("rate limit", () => {
  test("los mapas no pasan de su tope", async () => {
    const { rateLimit, recordFail, tamanosDeMapas, MAX_ENTRADAS } = await import("@/lib/rate-limit");
    for (let i = 0; i < MAX_ENTRADAS + 500; i++) {
      rateLimit(`ip-${i}`, 5, 60_000);
      recordFail(`f-${i}`, 5, 60_000);
    }
    const t = tamanosDeMapas();
    assert.ok(t.ventanas <= MAX_ENTRADAS, `ventanas: ${t.ventanas}`);
    assert.ok(t.fallos <= MAX_ENTRADAS, `fallos: ${t.fallos}`);
    assert.equal(rateLimit("ip-reciente", 1, 60_000).ok, true);
    assert.equal(rateLimit("ip-reciente", 1, 60_000).ok, false);
  });
});

describe("login", () => {
  test("sin hashSync al cargar y compara aunque la cuenta no exista", async () => {
    const bcrypt = req("bcryptjs") as typeof import("bcryptjs");
    const hashSync = bcrypt.hashSync;
    const compare = bcrypt.compare;
    let sync = 0;
    const comparados: string[] = [];
    bcrypt.hashSync = ((...a: Parameters<typeof hashSync>) => { sync++; return hashSync(...a); }) as typeof hashSync;
    bcrypt.compare = (async (p: string, h: string) => { comparados.push(h); return false; }) as typeof compare;
    try {
      const { POST } = await import("@/app/api/auth/login/route");
      assert.equal(sync, 0);
      const r = await POST(post("/api/auth/login", { email: "nadie@ejemplo.test", password: "x-x-x-x-x-x" }));
      assert.equal(r.status, 401, JSON.stringify(await r.clone().json()));
      assert.equal(sync, 0);
      assert.equal(comparados.length, 1);
      assert.match(comparados[0]!, /^\$2[aby]\$12\$/);
    } finally {
      bcrypt.hashSync = hashSync;
      bcrypt.compare = compare;
    }
  });
});

describe("check-in y stats", () => {
  test("el escaneo no cuenta en cada petición y stats responde con los totales", async () => {
    const { Registration } = await import("@/models/registration");
    await Registration.deleteMany({});
    await Registration.collection.insertMany(
      Array.from({ length: 4 }, (_, i) => ({ firstName: "A", lastName: `B${i}`, email: `s${i}@ejemplo.test`, qrCode: `S-${i}`, checkedIn: false })),
    );
    let cuentas = 0;
    const cd = Registration.countDocuments.bind(Registration);
    (Registration as unknown as { countDocuments: unknown }).countDocuments = (...a: Parameters<typeof cd>) => { cuentas++; return cd(...a); };
    const { POST } = await import("@/app/api/check-in/scan/route");
    const totales: number[] = [];
    for (let i = 0; i < 4; i++) totales.push((await (await POST(post("/api/check-in/scan", { qrCode: `S-${i}` }))).json()).totalCheckedIn);
    (Registration as unknown as { countDocuments: unknown }).countDocuments = cd;
    assert.ok(cuentas <= 1, `countDocuments: ${cuentas}`);
    assert.deepEqual(totales.slice(-1), [4]);

    const { GET } = await import("@/app/api/stats/route");
    const s = await (await GET()).json();
    assert.equal(s.totalRegistrations, 4);
    assert.equal(s.totalCheckedIn, 4);
    assert.equal(s.checkInRate, 100);
    assert.equal(s.checkInsByDay.length, 1);
  });
});
