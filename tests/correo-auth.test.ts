import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import { DOCUMENTOS, ROLES, ENTIDADES } from "@/config";

// Correo del registro fuera de la petición, un solo cliente SES y la sesión consultada una vez por petición.
const req = createRequire(import.meta.url);
let servidor: MongoMemoryServer;
let cookie = "";
let ip = 0;

// `cache()` de React solo deduplica con el despachador de Next; aquí se monta uno por «petición».
// Se carga el build de servidor de React y se sustituye en la caché de módulos antes de importar `auth`.
let nuevaPeticion = () => {};
function react19Servidor() {
  const reactDir = path.dirname(req.resolve("react/package.json"));
  const servidorReact = req(path.join(reactDir, "cjs/react.react-server.development.js"));
  let almacen: unknown;
  servidorReact.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.A = {
    getCacheForType: (f: () => unknown) => (almacen ??= f()),
    cacheSignal: () => null,
  };
  nuevaPeticion = () => { almacen = undefined; };
  const cliente = req("react");
  req.cache[req.resolve("react")]!.exports = { ...cliente, cache: servidorReact.cache };
}

const doc = DOCUMENTOS[0];
const datos = (email: string) => ({
  firstName: "Ana", lastName: "Prueba", email, attendance: "in-person",
  documentType: doc!.value, documentNumber: "12345678",
  role: ROLES[0]!.value, entityType: ENTIDADES.find((e) => e.value === "none")?.value ?? ENTIDADES[0]!.value,
  entityName: "Entidad de prueba", acceptCoc: true, acceptPrivacy: true,
});
const post = (email: string) =>
  new NextRequest("http://prueba.test/api/registrations", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${++ip}` },
    body: JSON.stringify({ data: datos(email) }),
  });

const esperar = async (cond: () => Promise<boolean>, ms = 6000) => {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await cond()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
};

before(async () => {
  process.env.JWT_SECRET = "secreto-de-prueba";
  delete process.env.TURNSTILE_SECRET_KEY;
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri("correoauth");

  react19Servidor();
  const headers = req("next/headers");
  Object.defineProperty(headers, "cookies", {
    value: async () => ({ get: (n: string) => (n === "cd-sesion" ? { value: cookie } : undefined) }),
    configurable: true,
  });

  const { connectDB } = await import("@/lib/db");
  const { signToken } = await import("@/lib/auth");
  const { User } = await import("@/models/user");
  const { Session } = await import("@/models/session");
  const { Form } = await import("@/models/form");
  await connectDB();
  await Form.create({ formType: "attendee", isOpen: true });
  const sessionId = "sesion-1";
  const ins = await User.collection.insertOne({
    email: "admin@ejemplo.test", name: "Voluntaria Prueba", role: "admin", currentSessionId: sessionId, permisos: [],
  });
  await Session.collection.insertOne({ userId: String(ins.insertedId), sessionId, expiresAt: new Date(Date.now() + 3600_000) });
  cookie = signToken({ userId: String(ins.insertedId), sessionId });
});

after(async () => {
  await mongoose.disconnect();
  await servidor?.stop();
});

describe("registro: el correo no retrasa la respuesta", () => {
  const fetchOriginal = globalThis.fetch;
  after(() => { globalThis.fetch = fetchOriginal; delete process.env.RESEND_API_KEY; });

  const proveedorLento = (estado: number, ms = 2000) => {
    process.env.RESEND_API_KEY = "re_prueba";
    globalThis.fetch = (async () => {
      await new Promise((r) => setTimeout(r, ms));
      return new Response(JSON.stringify(estado === 200 ? { id: "id-prueba" } : { message: "boom" }), { status: estado });
    }) as typeof fetch;
  };

  test("con el proveedor retenido la ruta responde igual y el estado queda en «sent»", async () => {
    const { POST } = await import("@/app/api/registrations/route");
    const { Registration } = await import("@/models/registration");
    // El proveedor no contesta hasta que la prueba lo suelta: si la ruta esperara
    // al correo, nunca respondería. Sin umbral de tiempo, que en CI es frágil.
    process.env.RESEND_API_KEY = "re_prueba";
    let soltar = () => {};
    const puerta = new Promise<void>((r) => { soltar = r; });
    globalThis.fetch = (async () => {
      await puerta;
      return new Response(JSON.stringify({ id: "id-prueba" }), { status: 200 });
    }) as typeof fetch;
    const limite = new Promise<never>((_, no) => setTimeout(() => no(new Error("la ruta esperó al correo")), 5000));
    const res = await Promise.race([POST(post("lento-ok@ejemplo.test")), limite]);
    assert.equal(res.status, 201);
    const antes = await Registration.findOne({ email: "lento-ok@ejemplo.test" }).lean();
    assert.equal(antes?.emailStatus, "pending");
    soltar();
    assert.ok(await esperar(async () => (await Registration.findOne({ email: "lento-ok@ejemplo.test" }).lean())?.emailStatus === "sent"));
    const fila = await Registration.findOne({ email: "lento-ok@ejemplo.test" }).lean();
    assert.equal(fila?.resendId, "id-prueba");
    assert.ok(fila?.emailSentAt);
  });

  test("si el envío falla, el estado queda en «failed» con su error", async () => {
    const { POST } = await import("@/app/api/registrations/route");
    const { Registration } = await import("@/models/registration");
    proveedorLento(500, 300);
    const res = await POST(post("lento-mal@ejemplo.test"));
    assert.equal(res.status, 201);
    assert.ok(await esperar(async () => (await Registration.findOne({ email: "lento-mal@ejemplo.test" }).lean())?.emailStatus === "failed"));
    const fila = await Registration.findOne({ email: "lento-mal@ejemplo.test" }).lean();
    assert.equal(fila?.emailError, "boom");
  });

  test("con el proveedor consola el estado también pasa a «sent»", async () => {
    const { POST } = await import("@/app/api/registrations/route");
    const { Registration } = await import("@/models/registration");
    globalThis.fetch = fetchOriginal;
    delete process.env.RESEND_API_KEY;
    const res = await POST(post("consola@ejemplo.test"));
    assert.equal(res.status, 201);
    assert.ok(await esperar(async () => (await Registration.findOne({ email: "consola@ejemplo.test" }).lean())?.emailStatus === "sent"));
  });
});

describe("SES", () => {
  test("new SESv2Client se ejecuta una sola vez aunque se envíen varios correos", async () => {
    const sdk = req("@aws-sdk/client-sesv2");
    const Original = sdk.SESv2Client;
    let creados = 0;
    class Contado {
      constructor() { creados++; }
      async send() { return { MessageId: "ses-1" }; }
    }
    sdk.SESv2Client = Contado;
    process.env.CORREO_PROVEEDOR = "ses";
    try {
      const { sendEmail } = await import("@/lib/correo");
      const un = { from: "a@ejemplo.test", to: "b@ejemplo.test", subject: "s", html: "<p>x</p>" };
      const rs = await Promise.all([sendEmail(un), sendEmail(un), sendEmail(un)]);
      await sendEmail(un);
      assert.deepEqual(rs.map((r) => r.id), ["ses-1", "ses-1", "ses-1"]);
      assert.equal(creados, 1);
    } finally {
      sdk.SESv2Client = Original;
      delete process.env.CORREO_PROVEEDOR;
    }
  });
});

describe("sesión", () => {
  test("requireAuth + createLog hacen como mucho 2 consultas de sesión/usuario", async () => {
    const { requireAuth } = await import("@/lib/auth");
    const { createLog } = await import("@/lib/log");
    const { Log } = await import("@/models/log");
    const consultas: string[] = [];
    mongoose.set("debug", (coleccion: string, metodo: string) => {
      if (coleccion === "sessions" || coleccion === "users") consultas.push(`${coleccion}.${metodo}`);
    });
    try {
      nuevaPeticion();
      const user = await requireAuth(["admin"]);
      await createLog({ action: "PRUEBA", target: "t" });
      console.log(`# consultas de sesión/usuario por petición: ${consultas.length}`);
      assert.equal(String(user.role), "admin");
      assert.ok(consultas.length <= 2, consultas.join(", "));
      assert.equal(await Log.countDocuments({ action: "PRUEBA", userName: "Voluntaria Prueba" }), 1);
    } finally {
      mongoose.set("debug", false);
    }
  });

  test("una sesión que no es la vigente se rechaza", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { User } = await import("@/models/user");
    await User.updateOne({ email: "admin@ejemplo.test" }, { currentSessionId: "otra" });
    nuevaPeticion();
    assert.equal(await getAuthUser(), null);
    await User.updateOne({ email: "admin@ejemplo.test" }, { currentSessionId: "sesion-1" });
    nuevaPeticion();
    assert.ok(await getAuthUser());
  });
});
