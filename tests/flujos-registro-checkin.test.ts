import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { DOCUMENTOS, ROLES } from "@/config";
import { montarEntorno, desmontarEntorno, sinSesion, peticion, conParams, leer } from "./helpers/entorno";

/** Registro → confirmación → check-in → pasaporte → pase, llamando a los handlers con Mongo en memoria. */

const BUCKET = "https://bucket-de-prueba.s3.amazonaws.com";
const fetchOriginal = globalThis.fetch;
const log = console.log;

const doc = DOCUMENTOS.find((d) => d.rule.kind === "digits") ?? DOCUMENTOS[0];
const numeroOk = doc!.rule.kind === "digits" ? "1".repeat(doc!.rule.min) : "12345678";
const datos = (email: string, extra: Record<string, unknown> = {}) => ({
  firstName: "Ana", lastName: "Prueba", email, attendance: "in-person",
  documentType: doc!.value, documentNumber: numeroOk,
  role: ROLES[0]!.value, entityType: "none", acceptCoc: true, acceptPrivacy: true, ...extra,
});
const registrar = async (email: string, extra: Record<string, unknown> = {}, cuerpo: Record<string, unknown> = {}) => {
  const { POST } = await import("@/app/api/registrations/route");
  return leer(await POST(peticion("/api/registrations", { data: datos(email, extra), ...cuerpo })));
};
const total = async () => (await import("@/models/registration")).Registration.countDocuments({});

before(async () => {
  console.log = () => {};
  process.env.AWS_S3_PUBLIC_URL = BUCKET;
  delete process.env.TURNSTILE_SECRET_KEY;
  await montarEntorno("flujos-registro");
  const { Form } = await import("@/models/form");
  await Form.create({ formType: "attendee", isOpen: true });
});
after(async () => {
  console.log = log;
  globalThis.fetch = fetchOriginal;
  await desmontarEntorno();
});

describe("registro: entradas inválidas devuelven 400 y no escriben", () => {
  const malas: [string, Record<string, unknown>][] = [
    ["sin nombre", { firstName: "" }],
    ["correo sin dominio", { email: "ana@" }],
    ["correo con salto de línea", { email: "ana@ejemplo.test\nBcc: x@ejemplo.test" }],
    ["documento con dígitos de menos", { documentNumber: "12" }],
    ["tipo de documento inventado", { documentType: "XYZ" }],
    ["modalidad inventada", { attendance: "hibrido" }],
    ["sin aceptar el código de conducta", { acceptCoc: false }],
    ["campo con operador de Mongo", { firstName: { $gt: "" } }],
  ];
  for (const [nombre, cambio] of malas) {
    test(nombre, async () => {
      const antes = await total();
      const r = await registrar("valido@ejemplo.test", cambio);
      assert.equal(r.status, 400, JSON.stringify(r.body));
      assert.equal(await total(), antes);
    });
  }

  test("`data` que no es un objeto", async () => {
    const { POST } = await import("@/app/api/registrations/route");
    for (const data of [[1, 2], "texto"]) {
      const r = await leer(await POST(peticion("/api/registrations", { data })));
      assert.equal(r.status, 400);
    }
    assert.equal(await total(), 0);
  });

  test("un cuerpo que no es JSON responde 400", async () => {
    const { POST } = await import("@/app/api/registrations/route");
    const r = await POST(peticion("/api/registrations", "{no es json"));
    assert.equal(r.status, 400);
  });

  test("alta manual sin sesión: 401 y no escribe", async () => {
    const volver = sinSesion();
    try {
      const r = await registrar("manual@ejemplo.test", {}, { manual: true });
      assert.equal(r.status, 401);
    } finally { volver(); }
    assert.equal(await total(), 0);
  });
});

describe("registro: captcha", () => {
  test("falla cerrado: sin token, con el servicio caído y con respuesta negativa", async () => {
    process.env.TURNSTILE_SECRET_KEY = "llave-de-prueba";
    try {
      // sin token
      assert.equal((await registrar("captcha1@ejemplo.test")).status, 400);
      // servicio caído
      globalThis.fetch = (async () => { throw new Error("red caída"); }) as typeof fetch;
      assert.equal((await registrar("captcha2@ejemplo.test", {}, { captchaToken: "t-caido" })).status, 400);
      // respuesta que no es JSON / no exitosa
      globalThis.fetch = (async () => new Response("<html>502</html>", { status: 502 })) as typeof fetch;
      assert.equal((await registrar("captcha3@ejemplo.test", {}, { captchaToken: "t-502" })).status, 400);
      globalThis.fetch = (async () => Response.json({ success: false })) as typeof fetch;
      assert.equal((await registrar("captcha4@ejemplo.test", {}, { captchaToken: "t-no" })).status, 400);
      assert.equal(await total(), 0);
    } finally { globalThis.fetch = fetchOriginal; }
  });

  test("con token válido entra, y el mismo token no vale dos veces", async () => {
    process.env.TURNSTILE_SECRET_KEY = "llave-de-prueba";
    globalThis.fetch = (async () => Response.json({ success: true })) as typeof fetch;
    try {
      assert.equal((await registrar("captcha5@ejemplo.test", {}, { captchaToken: "t-ok" })).status, 201);
      assert.equal((await registrar("captcha6@ejemplo.test", {}, { captchaToken: "t-ok" })).status, 400);
    } finally {
      globalThis.fetch = fetchOriginal;
      delete process.env.TURNSTILE_SECRET_KEY;
    }
    assert.equal(await total(), 1);
  });
});

describe("registro: duplicados y cupo", () => {
  test("el mismo correo, aunque cambien mayúsculas o espacios, da 409 y no duplica", async () => {
    assert.equal((await registrar("dup@ejemplo.test")).status, 201);
    const antes = await total();
    for (const variante of ["dup@ejemplo.test", "DUP@Ejemplo.TEST", "  dup@ejemplo.test "]) {
      assert.equal((await registrar(variante)).status, 409, variante);
    }
    assert.equal(await total(), antes);
  });

  test("diez altas a la vez con el mismo correo: una sola entra", async () => {
    const rs = await Promise.all(Array.from({ length: 10 }, () => registrar("carrera@ejemplo.test")));
    assert.equal(rs.filter((r) => r.status === 201).length, 1, JSON.stringify(rs.map((r) => r.status)));
    assert.ok(rs.every((r) => r.status === 201 || r.status === 409));
    const { Registration } = await import("@/models/registration");
    assert.equal(await Registration.countDocuments({ email: "carrera@ejemplo.test" }), 1);
  });

  test("un voluntario no puede registrarse como asistente", async () => {
    const { VolunteerSubmission } = await import("@/models/volunteer-submission");
    await VolunteerSubmission.collection.insertOne({
      firstName: "Vo", lastName: "Luntario", email: "vol@ejemplo.test", role: "student", entityType: "none", approved: true,
    });
    assert.equal((await registrar("vol@ejemplo.test")).status, 409);
  });

  test("con el registro cerrado o lleno no entra nadie", async () => {
    const { Form } = await import("@/models/form");
    await Form.updateOne({ formType: "attendee" }, { isOpen: false });
    assert.equal((await registrar("cerrado@ejemplo.test")).status, 404);
    await Form.updateOne({ formType: "attendee" }, { isOpen: true, maxSubmissions: 1 });
    assert.equal((await registrar("lleno@ejemplo.test")).status, 400);
    await Form.updateOne({ formType: "attendee" }, { maxSubmissions: null });
    const { Registration } = await import("@/models/registration");
    assert.equal(await Registration.countDocuments({ email: { $in: ["cerrado@ejemplo.test", "lleno@ejemplo.test"] } }), 0);
  });
});

describe("el día del evento, de punta a punta", () => {
  let qr = "";
  let corto = "";
  const scan = async (codigo: unknown) => {
    const { POST } = await import("@/app/api/check-in/scan/route");
    return leer(await POST(peticion("/api/check-in/scan", { qrCode: codigo })));
  };

  test("registro → pasaporte y correo de confirmación", async () => {
    const r = await registrar("dia@ejemplo.test");
    assert.equal(r.status, 201);
    qr = String(r.body.qrCode);
    const { Registration } = await import("@/models/registration");
    const { Passport } = await import("@/models/passport");
    const pass = await Passport.findOne({ linkedRegistrationId: String(r.body.id) }).lean();
    assert.ok(pass, "se crea el pasaporte ligado al registro");
    assert.notEqual(pass.shortId, qr, "el shortId no es el código del pase");
    corto = pass.shortId;
    assert.equal(pass.linkedRegistrationId, String(r.body.id));
    assert.match(pass.viewPin ?? "", /\d{4,}/);
    // El correo sale tras responder; con «consola» queda en «sent».
    const fin = Date.now() + 5000;
    let fila = await Registration.findOne({ qrCode: qr }).lean();
    while (fila?.emailStatus !== "sent" && Date.now() < fin) {
      await new Promise((s) => setTimeout(s, 25));
      fila = await Registration.findOne({ qrCode: qr }).lean();
    }
    assert.equal(fila?.emailStatus, "sent");
  });

  test("el pase en PDF se descarga con el código", async () => {
    const { GET } = await import("@/app/api/passes/[qrCode]/route");
    const ok = await GET(peticion("/api/passes/x", undefined, "GET"), conParams({ qrCode: qr }));
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get("content-type") ?? "", /pdf/);
    const no = await GET(peticion("/api/passes/x", undefined, "GET"), conParams({ qrCode: "no-existe" }));
    assert.equal(no.status, 404);
  });

  test("confirmación: nombre fuera de las opciones 400, bueno 200, repetido 409", async () => {
    const { GET, POST } = await import("@/app/api/confirm/[token]/route");
    const ctx = conParams({ token: qr });
    const antes = await leer(await GET(peticion("/api/confirm/x", undefined, "GET"), ctx));
    assert.equal(antes.body.status, "pending");
    assert.match(String(antes.body.email), /\*/, "el correo viaja enmascarado");

    const mal = await leer(await POST(peticion("/api/confirm/x", { badgeFirstName: "HACKER", badgeLastName: "X" }), ctx));
    assert.equal(mal.status, 400);
    const ok = await leer(await POST(peticion("/api/confirm/x", { badgeFirstName: "ana", badgeLastName: "prueba" }), ctx));
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const otra = await leer(await POST(peticion("/api/confirm/x", { badgeFirstName: "ANA", badgeLastName: "PRUEBA" }), ctx));
    assert.equal(otra.status, 409);
    const inex = await leer(await POST(peticion("/api/confirm/x", {}), conParams({ token: "nadie" })));
    assert.equal(inex.status, 404);
  });

  test("check-in: sin sesión 401, sin código 400, desconocido 404, y el mismo QR en dos lectores cuenta uno", async () => {
    const volver = sinSesion();
    try { assert.equal((await scan(qr)).status, 401); } finally { volver(); }
    assert.equal((await scan("")).status, 400);
    const { Registration } = await import("@/models/registration");
    assert.equal(await Registration.countDocuments({ checkedIn: true }), 0);

    const rs = await Promise.all([scan(qr), scan(qr), scan(qr)]);
    assert.deepEqual(rs.map((r) => r.status).sort(), [200, 409, 409]);
    const ganador = rs.find((r) => r.status === 200)!;
    assert.equal(ganador.body.confirmed, true);
    assert.equal(ganador.body.badgeName, "ANA PRUEBA");
    assert.ok(rs.filter((r) => r.status === 409).every((r) => r.body.status === "already_checked_in"));
    assert.equal(await Registration.countDocuments({ checkedIn: true }), 1);
    const { Log } = await import("@/models/log");
    // El log se escribe después de responder: se espera a que aparezca.
    let logs = 0;
    for (let i = 0; i < 50 && logs === 0; i++) {
      logs = await Log.countDocuments({ action: "CHECK_IN" });
      if (logs === 0) await new Promise((r) => setTimeout(r, 20));
    }
    assert.equal(logs, 1);
  });

  test("check-in: un código que no es texto no marca a nadie", async () => {
    const { Registration } = await import("@/models/registration");
    await Registration.collection.insertOne({ firstName: "Otra", lastName: "Persona", email: "otra@ejemplo.test", qrCode: "QR-OTRA", checkedIn: false });
    const r = await scan({ $ne: null });
    assert.ok(r.status >= 400 && r.status < 500, String(r.status));
    assert.equal(await Registration.countDocuments({ qrCode: "QR-OTRA", checkedIn: true }), 0);
  });

  test("pasaporte: sello con PIN de patrocinador, foto solo del bucket", async () => {
    const { SponsorPin } = await import("@/models/sponsor-pin");
    const { Passport } = await import("@/models/passport");
    await SponsorPin.collection.insertOne({ pin: "4321", sponsorName: "Patrocinador Ejemplo", isActive: true, totalStamps: 0 });
    const { POST: sellar } = await import("@/app/api/passport/[shortId]/stamp/route");
    const ctx = conParams({ shortId: corto });
    assert.equal((await leer(await sellar(peticion("/x", {}), ctx))).status, 400);
    assert.equal((await leer(await sellar(peticion("/x", { pin: "0000" }), ctx))).status, 400);
    assert.equal((await leer(await sellar(peticion("/x", { pin: "4321" }), ctx))).status, 200);
    assert.equal((await leer(await sellar(peticion("/x", { pin: "4321" }), ctx))).status, 409);
    assert.equal((await leer(await sellar(peticion("/x", { pin: "4321" }), conParams({ shortId: "nadie" })))).status, 404);
    const pass = await Passport.findOne({ shortId: corto }).lean();
    assert.equal(pass?.stamps?.length, 1);

    const { PATCH } = await import("@/app/api/passport/[shortId]/route");
    const pin = pass!.viewPin;
    const parchar = async (cuerpo: Record<string, unknown>) =>
      leer(await PATCH(peticion("/x", { pin, ...cuerpo }, "PATCH"), ctx));
    for (const ajena of ["https://evil.example/a.png", `${BUCKET}.evil.example/a.png`, `${BUCKET}/../x.png`, "javascript:alert(1)"]) {
      assert.equal((await parchar({ photoUrl: ajena })).status, 400, ajena);
    }
    assert.equal((await parchar({ photoUrl: "https://evil.example/a.png" })).status, 400);
    assert.equal((await Passport.findOne({ shortId: corto }).lean())?.photoUrl ?? "", "");
    assert.equal((await leer(await PATCH(peticion("/x", { pin: "9999999", photoUrl: `${BUCKET}/a.png` }, "PATCH"), ctx))).status, 401);
    const ok = await parchar({ photoUrl: `${BUCKET}/pasaportes/a.png` });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal((await Passport.findOne({ shortId: corto }).lean())?.photoUrl, `${BUCKET}/pasaportes/a.png`);
  });
});
