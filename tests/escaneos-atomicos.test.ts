import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";

// Dos escaneos del mismo QR a la vez: solo uno cuenta. Se prueba contra una base
// real en memoria, porque un doble de la base no reproduce la carrera.
const req = createRequire(import.meta.url);
let servidor: MongoMemoryServer;
let cookie = "";

const post = (url: string, body: unknown) =>
  new NextRequest(`http://prueba.test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: JSON.stringify(body),
  });

// Cada ruta se llama dos veces en paralelo; devuelve estado HTTP y cuerpo.
async function doble(llamar: () => Promise<Response>) {
  const rs = await Promise.all([llamar(), llamar()]);
  return Promise.all(rs.map(async (r) => ({ status: r.status, body: await r.json() as Record<string, unknown> })));
}

before(async () => {
  process.env.JWT_SECRET = "secreto-de-prueba";
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri("escaneos");

  // `cookies()` de Next no existe fuera de una petición: se sustituye por la sesión de prueba.
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

describe("escaneos simultáneos", () => {
  test("check-in: uno entra y el otro ya estaba dentro", async () => {
    const { Registration } = await import("@/models/registration");
    await Registration.collection.insertOne({
      firstName: "Ana", lastName: "Prueba", email: "ana@ejemplo.test", qrCode: "QR-1", checkedIn: false,
    });
    const { POST } = await import("@/app/api/check-in/scan/route");
    const r = await doble(() => POST(post("/api/check-in/scan", { qrCode: "QR-1" })));
    const ok = r.filter((x) => x.status === 200);
    const dup = r.filter((x) => x.status === 409);
    assert.equal(ok.length, 1);
    assert.equal(dup.length, 1);
    assert.equal(ok[0]!.body.status, "success");
    assert.equal(dup[0]!.body.status, "already_checked_in");
    assert.equal(dup[0]!.body.error, "Ya hizo check-in");
    assert.equal(await Registration.countDocuments({ checkedIn: true }), 1);

    const nuevo = await POST(post("/api/check-in/scan", { qrCode: "NO-EXISTE" }));
    assert.equal(nuevo.status, 404);
    assert.equal((await nuevo.json()).status, "not_found");
  });

  test("almuerzo: uno entrega y el otro ya estaba reclamado", async () => {
    const { Passport } = await import("@/models/passport");
    await Passport.create({ shortId: "P-ALM", role: "attendee", firstName: "Luis" });
    const { POST } = await import("@/app/api/scanner/meals/route");
    const r = await doble(() => POST(post("/api/scanner/meals", { shortId: "P-ALM", type: "lunch" })));
    assert.deepEqual(r.map((x) => x.body.alreadyClaimed).sort(), [false, true]);
    assert.ok(r.every((x) => x.status === 200 && x.body.found === true));
    const dup = r.find((x) => x.body.alreadyClaimed)!;
    assert.equal(dup.body.claimedBy, "Voluntaria Prueba");
    assert.ok(dup.body.claimedAt);
    // El refrigerio es otro derecho: no queda bloqueado por el almuerzo.
    const s = await POST(post("/api/scanner/meals", { shortId: "P-ALM", type: "snack" }));
    assert.equal((await s.json()).alreadyClaimed, false);
    const no = await POST(post("/api/scanner/meals", { shortId: "NADA", type: "lunch" }));
    assert.equal(no.status, 404);
  });

  test("asistencia a sala: una sola entrada por sesión", async () => {
    const { Passport } = await import("@/models/passport");
    await Passport.create({ shortId: "P-SAL", role: "attendee", firstName: "Eva" });
    const { POST } = await import("@/app/api/scanner/attendance/route");
    const cuerpo = { shortId: "P-SAL", sessionId: "S1", sessionTitle: "Charla", room: "A" };
    const r = await doble(() => POST(post("/api/scanner/attendance", cuerpo)));
    assert.deepEqual(r.map((x) => x.body.alreadyScanned).sort(), [false, true]);
    assert.ok(r.find((x) => x.body.alreadyScanned)!.body.scannedAt);
    const p = await Passport.findOne({ shortId: "P-SAL" }).lean();
    assert.equal(p.sessionAttendance.length, 1);
    const otra = await POST(post("/api/scanner/attendance", { ...cuerpo, sessionId: "S2" }));
    assert.equal((await otra.json()).alreadyScanned, false);
  });

  test("escarapela/sello del escáner: un solo sello por patrocinador", async () => {
    const { Passport } = await import("@/models/passport");
    const { SponsorPin } = await import("@/models/sponsor-pin");
    await Passport.create({ shortId: "P-BAD", role: "attendee", firstName: "Rai" });
    const sp = await SponsorPin.create({ sponsorName: "Patrocinador Uno", pin: "1111", isActive: true });
    const { POST } = await import("@/app/api/scanner/badge/route");
    const cuerpo = { shortId: "P-BAD", sponsorId: String(sp._id) };
    const r = await doble(() => POST(post("/api/scanner/badge", cuerpo)));
    assert.deepEqual(r.map((x) => x.body.alreadyHas).sort(), [false, true]);
    assert.ok(r.every((x) => x.body.sponsorName === "Patrocinador Uno"));
    assert.equal((await Passport.findOne({ shortId: "P-BAD" }).lean()).stamps.length, 1);
    assert.equal((await SponsorPin.findById(sp._id).lean()).totalStamps, 1);
  });

  test("sello del pasaporte con PIN: uno sella y el otro recibe 409", async () => {
    const { Passport } = await import("@/models/passport");
    const { SponsorPin } = await import("@/models/sponsor-pin");
    await Passport.create({ shortId: "P-PIN", role: "attendee", firstName: "Zoe" });
    const sp = await SponsorPin.create({ sponsorName: "Patrocinador Dos", pin: "2222", isActive: true });
    const { POST } = await import("@/app/api/passport/[shortId]/stamp/route");
    const llamar = () => POST(post("/api/passport/P-PIN/stamp", { pin: "2222" }), { params: Promise.resolve({ shortId: "P-PIN" }) });
    const r = await doble(llamar);
    assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
    assert.equal(r.find((x) => x.status === 409)!.body.error, "Ya tienes el sello de este sponsor");
    assert.equal((await Passport.findOne({ shortId: "P-PIN" }).lean()).stamps.length, 1);
    assert.equal((await SponsorPin.findById(sp._id).lean()).totalStamps, 1);
  });
});
