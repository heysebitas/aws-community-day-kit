import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Webhook } from "svix";
import { montarEntorno, desmontarEntorno, sinSesion, peticion, leer } from "./helpers/entorno";

/** Webhook de Resend (firmado con svix), certificados y campañas, con Mongo en memoria. */

const fetchOriginal = globalThis.fetch;
const log = console.log;
const SECRETO = "whsec_" + Buffer.from("secreto-de-prueba-para-svix-0001").toString("base64");

before(async () => {
  console.log = () => {};
  process.env.CORREO_REINTENTO_MS = "5";
  await montarEntorno("flujos-correo");
});
after(async () => {
  console.log = log;
  globalThis.fetch = fetchOriginal;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_WEBHOOK_SECRET;
  await desmontarEntorno();
});

describe("webhook de Resend", () => {
  const firmado = (evento: unknown, secreto = SECRETO) => {
    const cuerpo = JSON.stringify(evento);
    const id = `msg_${Math.random().toString(36).slice(2)}`;
    const ts = new Date();
    const firma = new Webhook(secreto).sign(id, ts, cuerpo);
    return peticion("/api/webhooks/resend", cuerpo, "POST", {
      "svix-id": id, "svix-timestamp": String(Math.floor(ts.getTime() / 1000)), "svix-signature": firma,
    });
  };
  const llamar = async (r: Request) => {
    const { POST } = await import("@/app/api/webhooks/resend/route");
    return leer(await POST(r as never));
  };

  test("sin secreto configurado responde 500 y no toca nada", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    assert.equal((await llamar(firmado({ type: "email.bounced", data: { email_id: "r1" } }))).status, 500);
  });

  test("firma ausente, ajena o con el cuerpo cambiado: 401 y no escribe", async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRETO;
    const { Registration } = await import("@/models/registration");
    await Registration.collection.insertOne({ email: "w@ejemplo.test", qrCode: "QR-W", resendId: "r-w", emailStatus: "sent" });

    const evento = { type: "email.bounced", data: { email_id: "r-w" } };
    assert.equal((await llamar(peticion("/api/webhooks/resend", JSON.stringify(evento)))).status, 401);
    const otraLlave = "whsec_" + Buffer.from("otra-llave-de-prueba-distinta-02").toString("base64");
    assert.equal((await llamar(firmado(evento, otraLlave))).status, 401);

    const buena = firmado(evento);
    const alterada = new Request(buena.url, { method: "POST", headers: buena.headers, body: JSON.stringify({ ...evento, data: { email_id: "r-otro" } }) });
    assert.equal((await llamar(alterada)).status, 401);
    assert.equal((await Registration.findOne({ qrCode: "QR-W" }).lean())?.emailStatus, "sent");
  });

  test("rebote y queja dejan «failed» con motivo; un «entregado» tardío no los pisa en el envío", async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRETO;
    const { Registration } = await import("@/models/registration");
    const { EmailEnvio } = await import("@/models/email-envio");
    await EmailEnvio.collection.insertOne({ resendId: "r-w", estado: "enviado", email: "w@ejemplo.test", plantilla: "p", campana: new mongoose.Types.ObjectId() });

    assert.equal((await llamar(firmado({ type: "email.bounced", data: { email_id: "r-w" } }))).status, 200);
    const fila = await Registration.findOne({ qrCode: "QR-W" }).lean();
    assert.equal(fila?.emailStatus, "failed");
    assert.equal(fila?.emailError, "Rebotó");
    assert.equal((await EmailEnvio.findOne({ resendId: "r-w" }).lean())?.estado, "rebotado");

    assert.equal((await llamar(firmado({ type: "email.delivered", data: { email_id: "r-w" } }))).status, 200);
    assert.equal((await EmailEnvio.findOne({ resendId: "r-w" }).lean())?.estado, "rebotado");

    // Un id desconocido, un evento que no nos dice nada y un cuerpo sin id responden 200 sin escribir.
    const antesDe = await Registration.findOne({ qrCode: "QR-W" }).lean();
    for (const ev of [{ type: "email.delivered", data: { email_id: "no-existe" } }, { type: "email.opened", data: { email_id: "r-w" } }, { type: "email.bounced", data: {} }]) {
      assert.equal((await llamar(firmado(ev))).status, 200);
    }
    assert.deepEqual(await Registration.findOne({ qrCode: "QR-W" }).lean(), antesDe);
  });

  test("un «entregado» tardío tampoco pisa el rebote en el registro del asistente", async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRETO;
    const { Registration } = await import("@/models/registration");
    await Registration.collection.insertOne({ email: "w3@ejemplo.test", qrCode: "QR-W3", resendId: "r-w3", emailStatus: "failed", emailError: "Rebotó" });
    await llamar(firmado({ type: "email.delivered", data: { email_id: "r-w3" } }));
    const fila = await Registration.findOne({ qrCode: "QR-W3" }).lean();
    assert.equal(fila?.emailStatus, "failed");
    assert.equal(fila?.emailError, "Rebotó");
  });

  test("«entregado» marca «sent» sin error", async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRETO;
    const { Registration } = await import("@/models/registration");
    await Registration.collection.insertOne({ email: "w2@ejemplo.test", qrCode: "QR-W2", resendId: "r-w2", emailStatus: "pending" });
    assert.equal((await llamar(firmado({ type: "email.delivered", data: { email_id: "r-w2" } }))).status, 200);
    const fila = await Registration.findOne({ qrCode: "QR-W2" }).lean();
    assert.equal(fila?.emailStatus, "sent");
    assert.ok(!fila?.emailError);
  });
});

describe("certificados de voluntariado", () => {
  const sembrar = async () => {
    const { VolunteerSubmission } = await import("@/models/volunteer-submission");
    await VolunteerSubmission.deleteMany({});
    const base = { lastName: "Prueba", role: "student", entityType: "none" };
    const docs = await VolunteerSubmission.insertMany([
      { ...base, firstName: "Uno", email: "uno@ejemplo.test", approved: true },
      { ...base, firstName: "Dos", email: "dos@ejemplo.test", approved: true, certName: "Dos Con Nombre Oficial" },
      { ...base, firstName: "Tres", email: "tres@ejemplo.test", approved: false },
    ]);
    return docs.map((d) => String(d._id));
  };
  const enviar = async (ids: unknown) => {
    const { POST } = await import("@/app/api/admin/certificates/send/route");
    return leer(await POST(peticion("/api/admin/certificates/send", { ids }) as never));
  };

  test("ids vacíos, de más o sin sesión: se rechaza sin enviar", async () => {
    assert.equal((await enviar([])).status, 400);
    assert.equal((await enviar("uno")).status, 400);
    assert.equal((await enviar(Array.from({ length: 101 }, (_, i) => `id${i}`))).status, 400);
    const volver = sinSesion();
    try { assert.equal((await enviar(["a"])).status, 401); } finally { volver(); }
  });

  test("manda solo a los aprobados y marca certSentAt de cada uno", async () => {
    const ids = await sembrar();
    const r = await enviar([...ids, "no-es-un-id"].slice(0, 3));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual([r.body.sentCount, r.body.failedCount], [2, 0]);
    const { VolunteerSubmission } = await import("@/models/volunteer-submission");
    const filas = await VolunteerSubmission.find({}).sort({ firstName: 1 }).lean();
    // Dos y Uno enviados; Tres no está aprobado.
    assert.deepEqual(filas.map((f) => [f.firstName, !!f.certSentAt]), [["Dos", true], ["Tres", false], ["Uno", true]]);
  });

  test("si el proveedor rechaza a uno, solo a ese no se le marca", async () => {
    const ids = await sembrar();
    process.env.RESEND_API_KEY = "re_prueba";
    process.env.CORREO_PROVEEDOR = "resend";
    const adjuntosVistos: string[] = [];
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
      const cuerpo = JSON.parse(String(init?.body));
      if (cuerpo.to === "uno@ejemplo.test") return new Response(JSON.stringify({ message: "rechazado" }), { status: 422 });
      adjuntosVistos.push(cuerpo.attachments?.[0]?.filename ?? "");
      return new Response(JSON.stringify({ id: "id-cert" }), { status: 200 });
    }) as typeof fetch;
    try {
      const r = await enviar(ids);
      assert.deepEqual([r.body.sentCount, r.body.failedCount], [1, 1]);
    } finally { globalThis.fetch = fetchOriginal; delete process.env.RESEND_API_KEY; process.env.CORREO_PROVEEDOR = "consola"; }
    assert.match(adjuntosVistos[0]!, /^certificado-.*\.pdf$/);
    const { VolunteerSubmission } = await import("@/models/volunteer-submission");
    assert.equal(!!(await VolunteerSubmission.findOne({ email: "uno@ejemplo.test" }).lean())?.certSentAt, false);
    assert.equal(!!(await VolunteerSubmission.findOne({ email: "dos@ejemplo.test" }).lean())?.certSentAt, true);
  });
});

describe("campañas", () => {
  const SLUG = "aviso-general";
  const N = 120;
  const lanzar = async (cuerpo: Record<string, unknown>) => {
    const { POST } = await import("@/app/api/admin/campanas/enviar/route");
    return leer(await POST(peticion("/api/admin/campanas/enviar", { plantilla: SLUG, ...cuerpo }) as never));
  };
  const marcados = async () => {
    const { Registration } = await import("@/models/registration");
    const { CAMPO_ENVIADOS } = await import("@/lib/audiencias-servidor");
    return Registration.collection.countDocuments({ [CAMPO_ENVIADOS.asistentes]: SLUG });
  };

  before(async () => {
    const { EmailTemplate } = await import("@/models/email-template");
    const { Registration } = await import("@/models/registration");
    await EmailTemplate.collection.insertOne({
      slug: SLUG, nombre: "Aviso general", asunto: "Hola {{nombre}}", preview: "", strip: "", descripcion: "",
      bloques: [{ tipo: "parrafo", texto: "Nos vemos pronto." }], deSistema: false, disparador: "", bloqueada: false, activa: true,
      audiencia: [{ publico: "asistentes", filtros: {} }], actualizadaPor: null, createdAt: new Date(), updatedAt: new Date(),
    });
    await Registration.collection.deleteMany({});
    await Registration.collection.insertMany(Array.from({ length: N }, (_, i) => ({
      firstName: `P${i}`, lastName: "Prueba", email: `camp${i}@ejemplo.test`, qrCode: `QR-C${i}`, attendance: "in-person",
      role: "student", entityType: "none", createdAt: new Date(), updatedAt: new Date(),
    })));
  });

  test("validaciones: sin plantilla 400, inexistente 404, sin totalEsperado 400, audiencia que creció 409", async () => {
    const { POST } = await import("@/app/api/admin/campanas/enviar/route");
    assert.equal((await leer(await POST(peticion("/x", {}) as never))).status, 400);
    assert.equal((await lanzar({ plantilla: "no-existe" })).status, 404);
    assert.equal((await lanzar({})).status, 400);
    assert.equal((await lanzar({ totalEsperado: N - 1 })).status, 409);
    assert.equal(await marcados(), 0);
  });

  test("cerrojo tomado: 409 y no se envía nada", async () => {
    const { tomarCerrojo, soltarCerrojo } = await import("@/models/email-cerrojo");
    assert.ok(await tomarCerrojo(`campana:${SLUG}`, "otra", 60_000));
    try {
      assert.equal((await lanzar({ totalEsperado: N })).status, 409);
      assert.equal(await marcados(), 0);
    } finally { await soltarCerrojo(`campana:${SLUG}`); }
  });

  test("un tramo que falla deja marcados solo los enviados y el reintento manda el resto, una vez", async () => {
    process.env.RESEND_API_KEY = "re_prueba";
    process.env.CORREO_PROVEEDOR = "resend";
    let lotes = 0;
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
      lotes++;
      const correos = JSON.parse(String(init?.body)) as { to: string }[];
      // El segundo lote de 50 se cae (también en los reintentos); el primero y el tercero salen.
      if (correos[0]!.to === "camp50@ejemplo.test") return new Response(JSON.stringify({ message: "caído" }), { status: 500 });
      return new Response(JSON.stringify({ data: correos.map((_, k) => ({ id: `id-${lotes}-${k}` })) }), { status: 200 });
    }) as typeof fetch;
    try {
      const r = await lanzar({ totalEsperado: N });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.deepEqual([r.body.enviados, r.body.fallidos], [70, 50]);
      assert.equal(r.body.restantes, 50);
      assert.equal(await marcados(), 70);
    } finally { globalThis.fetch = fetchOriginal; delete process.env.RESEND_API_KEY; process.env.CORREO_PROVEEDOR = "consola"; }

    // Reintento con el proveedor sano: solo los 50 sin marcar, ninguno repetido.
    const r2 = await lanzar({ totalEsperado: 50 });
    assert.equal(r2.status, 200, JSON.stringify(r2.body));
    assert.deepEqual([r2.body.enviados, r2.body.fallidos, r2.body.restantes], [50, 0, 0]);
    assert.equal(await marcados(), N);
    assert.equal((await lanzar({ totalEsperado: 0 })).status, 400, "ya no queda nadie");

    const { EmailCampana } = await import("@/models/email-campana");
    const campanas = await EmailCampana.find({}).sort({ createdAt: 1 }).lean();
    assert.deepEqual(campanas.map((c) => c.estado), ["hecho", "hecho"]);
  });
});
