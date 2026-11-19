import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";

// El shortId que se comparte del pasaporte no abre el pase ni la confirmación.
const req = createRequire(import.meta.url);
let servidor: MongoMemoryServer;
let cookie = "";
const cookies: Record<string, string> = {};

const pedir = (url: string, init: { method?: string; body?: unknown } = {}) =>
  new NextRequest(`http://prueba.test${url}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.20" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

before(async () => {
  process.env.JWT_SECRET = "secreto-de-prueba";
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri("identidad");

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
  for (const role of ["admin", "volunteer", "badges"]) {
    const sessionId = `sesion-${role}`;
    const ins = await User.collection.insertOne({
      email: `${role}@ejemplo.test`, name: role, role, currentSessionId: sessionId, permisos: [],
    });
    await Session.collection.insertOne({ userId: String(ins.insertedId), sessionId, expiresAt: new Date(Date.now() + 3600_000) });
    cookies[role] = signToken({ userId: String(ins.insertedId), sessionId });
  }
});

after(async () => {
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
  await servidor?.stop();
});

/** Un registro y su pasaporte como los dejaba la versión anterior: shortId === qrCode. */
async function sembrarViejo(qr: string) {
  const { Registration } = await import("@/models/registration");
  const { Passport } = await import("@/models/passport");
  const ins = await Registration.collection.insertOne({
    firstName: "Ana", lastName: "Prueba", email: `${qr}@ejemplo.test`, qrCode: qr, attendance: "in-person",
    documentType: "CC", documentNumber: "123", role: "student", entityType: "university", entityName: "Uni",
    consent: { codeOfConduct: new Date(), privacy: new Date() },
    confirmation: { confirmed: false },
  });
  await Passport.collection.insertOne({
    shortId: qr, role: "attendee", firstName: "Ana", lastName: "Prueba", linkedRegistrationId: String(ins.insertedId), viewPin: "1234",
    busqueda: ["ana", "prueba", qr.toLowerCase()],
  });
  return String(ins.insertedId);
}

describe("identificadores del pasaporte", () => {
  test("un registro nuevo tiene shortId, qrCode y tokenConfirmacion distintos", async () => {
    const { Registration } = await import("@/models/registration");
    const { Passport } = await import("@/models/passport");
    const { nuevoShortId } = await import("@/lib/identidad");
    const reg = await Registration.create({
      firstName: "Luz", lastName: "Nueva", email: "luz@ejemplo.test", attendance: "in-person",
      documentType: "CC", documentNumber: "123", role: "student", entityType: "university", entityName: "Uni",
      consent: { codeOfConduct: new Date(), privacy: new Date() }, qrCode: "QR-NUEVO-1",
    });
    const p = await Passport.create({ shortId: nuevoShortId(), role: "attendee", firstName: "Luz", linkedRegistrationId: String(reg._id) });
    assert.ok(reg.tokenConfirmacion && reg.tokenConfirmacion.length >= 20);
    assert.notEqual(p.shortId, reg.qrCode);
    assert.notEqual(p.shortId, reg.tokenConfirmacion);

    const { GET } = await import("@/app/api/passes/[qrCode]/route");
    const conShort = await GET(pedir(`/api/passes/${p.shortId}`), { params: Promise.resolve({ qrCode: p.shortId }) });
    assert.equal(conShort.status, 404);
    const conToken = await GET(pedir(`/api/passes/${reg.tokenConfirmacion}`), { params: Promise.resolve({ qrCode: reg.tokenConfirmacion! }) });
    assert.equal(conToken.status, 404);
    const conQr = await GET(pedir("/api/passes/QR-NUEVO-1"), { params: Promise.resolve({ qrCode: "QR-NUEVO-1" }) });
    assert.equal(conQr.status, 200);
    assert.match(conQr.headers.get("cache-control") ?? "", /private/);

    const { GET: confirmar } = await import("@/app/api/confirm/[token]/route");
    const porShort = await confirmar(pedir(`/api/confirm/${p.shortId}`), { params: Promise.resolve({ token: p.shortId }) });
    assert.equal(porShort.status, 404);
    const porToken = await confirmar(pedir("/x"), { params: Promise.resolve({ token: reg.tokenConfirmacion! }) });
    assert.equal(porToken.status, 200);
    assert.equal((await porToken.json()).found, true);
  });

  test("migración: separa los identificadores, guarda el viejo y repetirla no cambia nada", async () => {
    const mongoose = (await import("mongoose")).default;
    const { migrar } = await import("../scripts/migrar-pasaporte.mjs");
    await sembrarViejo("VIEJO-A1");
    await sembrarViejo("VIEJO-A2");
    const conn = mongoose.connection;
    const pasaportes = conn.collection("passports");
    const regs = conn.collection("registrations");

    const seco = await migrar(conn, { dryRun: true });
    assert.equal(seco.shortIds, 2);
    assert.equal(await pasaportes.countDocuments({ shortId: "VIEJO-A1" }), 1, "en seco no escribe");

    const primera = await migrar(conn);
    assert.equal(primera.shortIds, 2);
    assert.ok(primera.tokensConfirmacion >= 2);
    const p = await pasaportes.findOne({ shortIdAnterior: "VIEJO-A1" });
    assert.ok(p && p.shortId !== "VIEJO-A1" && p.shortId.length >= 10);
    assert.ok((p.busqueda as string[]).includes(p.shortId.toLowerCase()));
    assert.equal(await pasaportes.countDocuments({ shortId: "VIEJO-A1" }), 0);

    const antes = JSON.stringify([await pasaportes.find({}).sort({ _id: 1 }).toArray(), await regs.find({}).sort({ _id: 1 }).toArray()]);
    const segunda = await migrar(conn);
    assert.deepEqual(segunda, { tokensConfirmacion: 0, shortIds: 0, cambiosPendientes: 0 });
    const despues = JSON.stringify([await pasaportes.find({}).sort({ _id: 1 }).toArray(), await regs.find({}).sort({ _id: 1 }).toArray()]);
    assert.equal(despues, antes);
  });

  test("tras migrar: el enlace de confirmación viejo sigue valiendo y la página vieja redirige", async () => {
    const mongoose = (await import("mongoose")).default;
    const { migrar } = await import("../scripts/migrar-pasaporte.mjs");
    await sembrarViejo("VIEJO-B1");
    await migrar(mongoose.connection);

    const { GET, POST } = await import("@/app/api/confirm/[token]/route");
    const ver = await GET(pedir("/x"), { params: Promise.resolve({ token: "VIEJO-B1" }) });
    assert.equal(ver.status, 200);
    const datos = await ver.json();
    assert.equal(datos.found, true);
    assert.equal(datos.firstName, "Ana", "el pasaporte se encuentra por el registro, no por el shortId");
    const ok = await POST(pedir("/x", { method: "POST", body: { badgeFirstName: "ANA", badgeLastName: "PRUEBA" } }), { params: Promise.resolve({ token: "VIEJO-B1" }) });
    assert.equal(ok.status, 200);

    const { shortIdNuevoDe } = await import("@/lib/lectores");
    const nuevo = await shortIdNuevoDe("VIEJO-B1");
    assert.ok(nuevo && nuevo !== "VIEJO-B1");
    const { leerPasaporte } = await import("@/lib/lectores");
    assert.equal(await leerPasaporte("VIEJO-B1"), null);
    assert.ok(await leerPasaporte(nuevo!));
  });

  test("terminado el evento los enlaces viejos dejan de valer", async () => {
    const { enlacesViejosVigentes } = await import("@/lib/identidad");
    const { EVENTO } = await import("@/config");
    const fin = new Date(EVENTO.fin).getTime();
    assert.equal(enlacesViejosVigentes(fin - 1000), true);
    assert.equal(enlacesViejosVigentes(fin + 1000), false);
  });

  test("el PIN del pasaporte va en el cuerpo de un POST, no en la URL", async () => {
    await sembrarViejo("VIEJO-C1");
    const { GET, POST } = await import("@/app/api/passport/[shortId]/route");
    const ctx = { params: Promise.resolve({ shortId: "VIEJO-C1" }) };
    const porUrl = await (await GET(pedir("/api/passport/VIEJO-C1?pin=1234"), ctx)).json();
    assert.equal(porUrl.isOwner, false);
    const porCuerpo = await (await POST(pedir("/api/passport/VIEJO-C1", { method: "POST", body: { pin: "1234" } }), ctx)).json();
    assert.equal(porCuerpo.isOwner, true);
  });
});

describe("privacidad y roles", () => {
  test("el listado de voluntarios sin documento para quien no es admin ni organizador", async () => {
    const { sinDocumento } = await import("@/lib/privacidad");
    const v = { firstName: "Eva", documentNumber: "99887766" };
    assert.equal(sinDocumento(v, "volunteer").documentNumber, undefined);
    assert.equal(sinDocumento(v, "badges").documentNumber, undefined);
    assert.equal(sinDocumento(v, "organizer").documentNumber, "99887766");
    assert.equal(sinDocumento(v, "admin").documentNumber, "99887766");
  });

  test("la ruta del listado: el voluntario no recibe el documento (ni el listado)", async () => {
    const { VolunteerSubmission } = await import("@/models/volunteer-submission");
    await VolunteerSubmission.collection.insertOne({ firstName: "Eva", lastName: "Prueba", email: "eva@ejemplo.test", documentNumber: "99887766", submittedAt: new Date() });
    const { GET } = await import("@/app/api/volunteers/route");
    cookie = cookies.volunteer!;
    const r = await GET();
    const texto = await r.text();
    assert.ok(!texto.includes("99887766"));
    cookie = cookies.admin!;
    const a = await GET();
    assert.equal(a.status, 200);
    assert.ok((await a.text()).includes("99887766"));
  });

  test("la cuenta de stand (badges) recibe 403 en el check-in; el voluntario entra", async () => {
    const { Registration } = await import("@/models/registration");
    await Registration.collection.insertOne({ firstName: "Pía", lastName: "Puerta", email: "pia@ejemplo.test", qrCode: "QR-PUERTA", checkedIn: false });
    const { POST } = await import("@/app/api/check-in/scan/route");
    cookie = cookies.badges!;
    const stand = await POST(pedir("/api/check-in/scan", { method: "POST", body: { qrCode: "QR-PUERTA" } }));
    assert.equal(stand.status, 403);
    assert.equal((await Registration.findOne({ qrCode: "QR-PUERTA" }).lean())!.checkedIn, false);
    cookie = cookies.volunteer!;
    const puerta = await POST(pedir("/api/check-in/scan", { method: "POST", body: { qrCode: "QR-PUERTA" } }));
    assert.equal(puerta.status, 200);
  });

  test("el QR sale con Cache-Control private", async () => {
    const { GET } = await import("@/app/api/pass-qr/[code]/route");
    const r = await GET(pedir("/api/pass-qr/ABC"), { params: Promise.resolve({ code: "ABC" }) });
    assert.match(r.headers.get("cache-control") ?? "", /^private/);
  });
});
