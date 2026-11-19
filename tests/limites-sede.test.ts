import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { montarEntorno, desmontarEntorno, peticion, conParams, leer } from "./helpers/entorno";

/** La sede entera sale por una sola IP: los límites por IP no pueden rechazar a quien entra bien. */

const IP_SEDE = { "x-forwarded-for": "198.51.100.77" };
const log = console.log;

before(async () => {
  console.log = () => {};
  delete process.env.TURNSTILE_SECRET_KEY;
  await montarEntorno("limites-sede");
  // El login escribe la cookie: la sesión simulada solo sabe leerla.
  const headers = (await import("node:module")).createRequire(import.meta.url)("next/headers");
  Object.defineProperty(headers, "cookies", {
    value: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
    configurable: true,
  });
  const { User } = await import("@/models/user");
  const passwordHash = await bcrypt.hash("clave-de-prueba", 4);
  await User.collection.insertOne({ email: "puerta@ejemplo.test", name: "Puerta Prueba", role: "volunteer", passwordHash, permisos: [] });
  await User.collection.insertOne({ email: "otra@ejemplo.test", name: "Otra Prueba", role: "volunteer", passwordHash, permisos: [] });
  const { SponsorPin } = await import("@/models/sponsor-pin");
  await SponsorPin.collection.insertOne({ pin: "4321", sponsorName: "Patrocinador Ejemplo", isActive: true, totalStamps: 0 });
  const { Passport } = await import("@/models/passport");
  for (let i = 0; i < 12; i++) await Passport.create({ shortId: `SEDE${i}`, role: "attendee", firstName: `Persona${i}` });
});
after(async () => {
  console.log = log;
  await desmontarEntorno();
});

describe("límites con una IP compartida", () => {
  test("40 logins válidos desde la misma IP dan 200", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    for (let i = 0; i < 40; i++) {
      const r = await leer(await POST(peticion("/api/auth/login", { email: "puerta@ejemplo.test", password: "clave-de-prueba" }, "POST", IP_SEDE)));
      assert.equal(r.status, 200, `login ${i + 1}: ${JSON.stringify(r.body)}`);
    }
  });

  test("10 contraseñas malas de un correo lo frenan, pero no a otro correo de la misma IP", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    let ultimo = 0;
    for (let i = 0; i < 11; i++) {
      ultimo = (await POST(peticion("/api/auth/login", { email: "puerta@ejemplo.test", password: "mala" }, "POST", IP_SEDE))).status;
    }
    assert.equal(ultimo, 429);
    const otra = await POST(peticion("/api/auth/login", { email: "otra@ejemplo.test", password: "clave-de-prueba" }, "POST", IP_SEDE));
    assert.equal(otra.status, 200);
  });

  test("10 PIN erróneos de pasaportes distintos desde la misma IP no bloquean un sello correcto", async () => {
    const { POST } = await import("@/app/api/passport/[shortId]/stamp/route");
    for (let i = 0; i < 10; i++) {
      const r = await POST(peticion(`/api/passport/SEDE${i}/stamp`, { pin: "0000" }, "POST", IP_SEDE), conParams({ shortId: `SEDE${i}` }));
      assert.equal(r.status, 400);
    }
    const ok = await leer(await POST(peticion("/api/passport/SEDE11/stamp", { pin: "4321" }, "POST", IP_SEDE), conParams({ shortId: "SEDE11" })));
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
  });

  test("el sello sigue limitando por pasaporte: 8 fallos bloquean ese pasaporte", async () => {
    const { POST } = await import("@/app/api/passport/[shortId]/stamp/route");
    let ultimo = 0;
    for (let i = 0; i < 9; i++) {
      ultimo = (await POST(peticion("/api/passport/SEDE10/stamp", { pin: "0000" }, "POST", IP_SEDE), conParams({ shortId: "SEDE10" }))).status;
    }
    assert.equal(ultimo, 429);
  });

  test("el pase PDF limita por código: 5 y luego 429", async () => {
    const { GET } = await import("@/app/api/passes/[qrCode]/route");
    const estados: number[] = [];
    for (let i = 0; i < 6; i++) {
      estados.push((await GET(peticion("/api/passes/NOEXISTE", undefined, "GET", IP_SEDE) as never, conParams({ qrCode: "NOEXISTE" }))).status);
    }
    assert.deepEqual(estados.slice(0, 5), [404, 404, 404, 404, 404]);
    assert.equal(estados[5], 429);
  });
});
