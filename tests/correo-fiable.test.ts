import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { montarEntorno, desmontarEntorno, peticion, leer } from "./helpers/entorno";
import { Cola } from "@/lib/cola";
import { sendEmail } from "@/lib/correo";

/** Correo fiable: tandas sin filtro, reintento, cerrojos, cola y registro sin esperar al PDF. */

const fetchOriginal = globalThis.fetch;
const log = console.log;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  console.log = () => {};
  process.env.CORREO_REINTENTO_MS = "5";
  process.env.COLA_ESPERA_MS = "5";
  delete process.env.TURNSTILE_SECRET_KEY;
  await montarEntorno("correo-fiable");
});
after(async () => {
  console.log = log;
  globalThis.fetch = fetchOriginal;
  delete process.env.RESEND_API_KEY;
  process.env.CORREO_PROVEEDOR = "consola";
  await desmontarEntorno();
});

const conResend = (f: typeof fetch) => {
  process.env.RESEND_API_KEY = "re_prueba";
  process.env.CORREO_PROVEEDOR = "resend";
  globalThis.fetch = f;
};
const sinResend = () => {
  globalThis.fetch = fetchOriginal;
  delete process.env.RESEND_API_KEY;
  process.env.CORREO_PROVEEDOR = "consola";
};

describe("sendEmail reintenta", () => {
  const correo = { from: "a@ejemplo.test", to: "b@ejemplo.test", subject: "Hola", html: "<p>hola</p>" };

  test("429 seguido de 200 queda enviado, con la misma Idempotency-Key", async () => {
    const claves: string[] = [];
    conResend((async (_u: unknown, init?: RequestInit) => {
      claves.push((init?.headers as Record<string, string>)["Idempotency-Key"]!);
      return claves.length === 1
        ? new Response("{}", { status: 429, headers: { "Retry-After": "0" } })
        : new Response(JSON.stringify({ id: "id-ok" }), { status: 200 });
    }) as typeof fetch);
    try {
      const r = await sendEmail(correo);
      assert.deepEqual(r, { id: "id-ok", error: null });
      assert.equal(claves.length, 2);
      assert.ok(claves[0] && claves[0] === claves[1]);
    } finally { sinResend(); }
  });

  test("5xx sostenido: 3 intentos y falla; un 4xx no se reintenta", async () => {
    let llamadas = 0;
    conResend((async () => { llamadas++; return new Response(JSON.stringify({ message: "caído" }), { status: 503 }); }) as typeof fetch);
    try {
      const r = await sendEmail(correo);
      assert.equal(llamadas, 3);
      assert.equal(r.error, "caído");
      llamadas = 0;
      globalThis.fetch = (async () => { llamadas++; return new Response(JSON.stringify({ message: "malo" }), { status: 422 }); }) as typeof fetch;
      assert.equal((await sendEmail(correo)).error, "malo");
      assert.equal(llamadas, 1);
    } finally { sinResend(); }
  });

  test("Retry-After manda sobre la espera exponencial", async () => {
    process.env.CORREO_REINTENTO_MS = "5000";
    let n = 0;
    conResend((async () => (++n === 1
      ? new Response("{}", { status: 429, headers: { "Retry-After": "0" } })
      : new Response(JSON.stringify({ id: "x" }), { status: 200 }))) as typeof fetch);
    const t0 = Date.now();
    try {
      assert.equal((await sendEmail(correo)).error, null);
      assert.ok(Date.now() - t0 < 1000);
    } finally { sinResend(); process.env.CORREO_REINTENTO_MS = "5"; }
  });
});

describe("campañas sin filtro de repetidos", () => {
  const SLUG = "aviso-650";
  const N = 650;

  before(async () => {
    const { EmailTemplate } = await import("@/models/email-template");
    const { Registration } = await import("@/models/registration");
    await EmailTemplate.collection.insertOne({
      slug: SLUG, nombre: "Aviso", asunto: "Hola", preview: "", strip: "", descripcion: "",
      bloques: [{ tipo: "parrafo", texto: "Nos vemos." }], deSistema: false, disparador: "", bloqueada: false, activa: true,
      audiencia: [{ publico: "asistentes", filtros: {} }], actualizadaPor: null, createdAt: new Date(), updatedAt: new Date(),
    });
    await Registration.collection.insertMany(Array.from({ length: N }, (_, i) => ({
      firstName: `P${i}`, lastName: "Prueba", email: `c650-${i}@ejemplo.test`, qrCode: `QR-650-${i}`, attendance: "online",
      role: "student", entityType: "none", createdAt: new Date(), updatedAt: new Date(),
    })));
  });

  test("650 en 3 tandas encadenadas con `desde`: nadie recibe dos correos", async () => {
    const { POST } = await import("@/app/api/admin/campanas/enviar/route");
    const recibidos: string[] = [];
    conResend((async (_u: unknown, init?: RequestInit) => {
      const lote = JSON.parse(String(init?.body)) as { to: string }[];
      lote.forEach((c) => recibidos.push(c.to));
      return new Response(JSON.stringify({ data: lote.map((_, k) => ({ id: `i-${recibidos.length}-${k}` })) }), { status: 200 });
    }) as typeof fetch);
    try {
      const restantes: number[] = [];
      let desde = 0;
      for (let i = 0; i < 5; i++) {
        const r = await leer(await POST(peticion("/api/admin/campanas/enviar", {
          plantilla: SLUG, evitarRepetidos: false, totalEsperado: N, desde,
        }) as never));
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.totalAudiencia, N);
        restantes.push(r.body.restantes as number);
        desde = r.body.siguiente as number;
        if (!r.body.restantes) break;
      }
      assert.deepEqual(restantes, [350, 50, 0]);
      assert.equal(recibidos.length, N);
      assert.equal(new Set(recibidos).size, N, "nadie repetido");
    } finally { sinResend(); }
  });
});

describe("cerrojos de envío masivo", () => {
  test("dos llamadas simultáneas a certificados: la segunda recibe 409 y nadie recibe dos", async () => {
    const { VolunteerSubmission } = await import("@/models/volunteer-submission");
    const docs = await VolunteerSubmission.insertMany([
      { firstName: "Uno", lastName: "P", email: "cert1@ejemplo.test", role: "student", entityType: "none", approved: true },
      { firstName: "Dos", lastName: "P", email: "cert2@ejemplo.test", role: "student", entityType: "none", approved: true },
    ]);
    const ids = docs.map((d) => String(d._id));
    const { POST } = await import("@/app/api/admin/certificates/send/route");
    const lanzar = async () => leer(await POST(peticion("/api/admin/certificates/send", { ids }) as never));
    const [a, b] = await Promise.all([lanzar(), lanzar()]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    const ok = a.status === 200 ? a : b;
    assert.equal(ok.body.sentCount, 2);
    // Una tercera, ya sin cerrojo, no repite a quien tiene certSentAt.
    const c = await lanzar();
    assert.equal(c.status, 200);
    assert.deepEqual([c.body.sentCount, c.body.skipped], [0, 2]);
  });

  test("dos aprobaciones masivas simultáneas: la segunda recibe 409", async () => {
    const { SpeakerProfile } = await import("@/models/speaker-profile");
    const p = await SpeakerProfile.collection.insertOne({
      name: "Ana Prueba", email: "spk@ejemplo.test", status: "pending", talkTitle: "Charla", sessionType: "presencial",
      createdAt: new Date(), updatedAt: new Date(),
    });
    const { POST } = await import("@/app/api/speakers/bulk-approve/route");
    const lanzar = async () => leer(await POST(peticion("/api/speakers/bulk-approve", { ids: [String(p.insertedId)] }) as never));
    const [a, b] = await Promise.all([lanzar(), lanzar()]);
    assert.ok([a.status, b.status].includes(409), JSON.stringify([a.body, b.body]));
  });
});

describe("cola en proceso", () => {
  const opciones = { concurrencia: 2, tope: 500, intentos: 3, esperaMs: 1 };

  test("nunca más de 2 a la vez y termina todo", async () => {
    const cola = new Cola(opciones);
    let activos = 0, maximo = 0, hechos = 0;
    for (let i = 0; i < 10; i++) {
      void cola.encolar(async () => { activos++; maximo = Math.max(maximo, activos); await dormir(5); activos--; hechos++; });
    }
    await cola.esperarVacia();
    assert.equal(maximo, 2);
    assert.equal(hechos, 10);
  });

  test("reintenta hasta 3 veces y deja de insistir", async () => {
    const cola = new Cola(opciones);
    let n = 0, ok = 0;
    await cola.encolar(async () => { if (++n < 3) throw new Error("x"); ok++; });
    assert.deepEqual([n, ok], [3, 1]);
    n = 0;
    await cola.encolar(async () => { n++; throw new Error("siempre"); });
    assert.equal(n, 3);
  });

  test("con la cola llena el trabajo corre en línea", async () => {
    const cola = new Cola({ ...opciones, concurrencia: 1, tope: 1 });
    const orden: string[] = [];
    const lento = cola.encolar(async () => { await dormir(10); orden.push("a"); });
    const quieto = cola.encolar(async () => { orden.push("b"); }); // queda pendiente (1 = tope)
    const enLinea = cola.encolar(async () => { orden.push("c"); }); // tope lleno: corre ya
    await enLinea;
    assert.deepEqual(orden, ["c"]);
    await Promise.all([lento, quieto]);
    assert.deepEqual(orden, ["c", "a", "b"]);
  });
});

describe("alta de registro", () => {
  test("responde sin esperar al correo; el envío se completa cuando la cola se vacía", async () => {
    const { Form } = await import("@/models/form");
    await Form.create({ formType: "attendee", isOpen: true });
    const { ROLES, DOCUMENTOS } = await import("@/config");
    const doc = DOCUMENTOS.find((d) => d.rule.kind === "digits") ?? DOCUMENTOS[0]!;
    const numero = doc.rule.kind === "digits" ? "1".repeat(doc.rule.min) : "12345678";

    let soltar!: () => void;
    const puerta = new Promise<void>((r) => { soltar = r; });
    let enviado = 0;
    conResend((async () => { await puerta; enviado++; return new Response(JSON.stringify({ id: "id-reg" }), { status: 200 }); }) as typeof fetch);
    try {
      const { POST } = await import("@/app/api/registrations/route");
      const r = await leer(await POST(peticion("/api/registrations", {
        data: {
          firstName: "Ana", lastName: "Prueba", email: "alta@ejemplo.test", attendance: "in-person",
          documentType: doc.value, documentNumber: numero, role: ROLES[0]!.value, entityType: "none",
          acceptCoc: true, acceptPrivacy: true,
        },
      }) as never));
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal(enviado, 0, "la respuesta no esperó al correo");
      const { Registration } = await import("@/models/registration");
      assert.equal((await Registration.findOne({ email: "alta@ejemplo.test" }).lean())?.emailStatus, "pending");

      soltar();
      const { esperarCola } = await import("@/lib/cola");
      await esperarCola();
      assert.equal(enviado, 1);
      assert.equal((await Registration.findOne({ email: "alta@ejemplo.test" }).lean())?.emailStatus, "sent");
    } finally { soltar(); sinResend(); }
  });
});

describe("reenviar fallidos", () => {
  test("manda a los fallidos, los marca enviados y una segunda llamada concurrente recibe 409", async () => {
    const { Registration } = await import("@/models/registration");
    await Registration.collection.insertMany(["f1", "f2"].map((k) => ({
      firstName: k, lastName: "P", email: `${k}@ejemplo.test`, qrCode: `QR-${k}`, attendance: "online",
      role: "student", entityType: "none", emailStatus: "failed", emailError: "x", createdAt: new Date(), updatedAt: new Date(),
    })));
    const { POST } = await import("@/app/api/admin/registrations/reenviar-fallidos/route");
    const lanzar = async () => leer(await POST(peticion("/api/admin/registrations/reenviar-fallidos", {}) as never));
    const [a, b] = await Promise.all([lanzar(), lanzar()]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    const ok = a.status === 200 ? a : b;
    assert.deepEqual([ok.body.enviados, ok.body.fallidos, ok.body.restantes], [2, 0, 0]);
    assert.equal(await Registration.countDocuments({ emailStatus: "failed" }), 0);
  });
});
