import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import mongoose from "mongoose";
import Module from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Passport } from "@/models/passport";
import { SponsorPin } from "@/models/sponsor-pin";

// Fuera de Next `unstable_cache` no tiene almacén: un Map con tags basta para ver la invalidación.
const almacen = new Map<string, { valor: unknown; tags: string[] }>();
const cargar = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: unknown })._load = function (this: unknown, pedido: unknown, ...resto: unknown[]) {
  const real = cargar.call(this, pedido, ...resto) as Record<string, unknown>;
  if (pedido !== "next/cache") return real;
  return {
    ...real,
    unstable_cache: (fn: (...a: unknown[]) => Promise<unknown>, claves: string[], opts: { tags?: string[] }) =>
      async (...args: unknown[]) => {
        const clave = JSON.stringify([claves, args]);
        const previa = almacen.get(clave);
        if (previa) return previa.valor;
        const valor = await fn(...args);
        almacen.set(clave, { valor, tags: opts.tags ?? [] });
        return valor;
      },
    revalidateTag: (tag: string) => {
      for (const [k, v] of almacen) if (v.tags.includes(tag)) almacen.delete(k);
    },
  };
};

const leer = (ruta: string) => fs.readFileSync(ruta, "utf8");

describe("lecturas en el servidor", () => {
  let servidor: MongoMemoryServer;

  before(async () => {
    servidor = await MongoMemoryServer.create();
    process.env.MONGODB_URI = servidor.getUri("community-day");
    await connectDB();
    await SponsorPin.create({ sponsorName: "Patrocinador Ejemplo", pin: "0000", isActive: true });
    await Passport.create({
      shortId: "prueba000001", role: "attendee", firstName: "Ana", lastName: "Ejemplo",
      social: { linkedin: "ana-ejemplo" }, viewPin: "1234",
      stamps: [{ sponsorId: "s1", sponsorName: "Patrocinador Ejemplo", stampedAt: new Date() }],
    });
  });

  after(async () => {
    await mongoose.disconnect();
    await servidor.stop();
    delete process.env.MONGODB_URI;
  });

  test("el lector del pasaporte devuelve los mismos campos que la API pública", async () => {
    const { leerPasaporte } = await import("@/lib/lectores");
    const { GET } = await import("@/app/api/passport/[shortId]/route");
    const leido = await leerPasaporte("prueba000001");
    assert.ok(leido);
    const api = await (await GET(new NextRequest("http://localhost/api/passport/prueba000001"), { params: Promise.resolve({ shortId: "prueba000001" }) })).json();
    assert.deepEqual(JSON.parse(JSON.stringify(leido.datos)), api);
    assert.equal(api.isOwner, false);
    // Nada interno: ni el PIN ni ids de documentos.
    assert.deepEqual(Object.keys(api.passport).sort(), ["company", "firstName", "jobTitle", "lastName", "photoUrl", "role", "shortId", "social", "stamps", "stats"]);
    assert.equal(await leerPasaporte("no-existe"), null);
  });

  test("/api/evento se sirve de la caché y la edición de speakers la invalida", async () => {
    const { datosDelEventoCacheados } = await import("@/lib/lectores-evento");
    const { revalidatePublic, SPEAKERS_TAG } = await import("@/lib/data/revalidate");
    await datosDelEventoCacheados("es");
    assert.equal(almacen.size > 0, true);
    revalidatePublic(SPEAKERS_TAG);
    assert.equal([...almacen.values()].some((e) => e.tags.includes(SPEAKERS_TAG)), false);
  });

  test("las rutas que escriben speakers y configuración invalidan", () => {
    for (const f of ["src/app/api/speaker-profiles/route.ts", "src/app/api/speaker-profiles/[slug]/route.ts", "src/app/api/speaker-profiles/reorder/route.ts"]) {
      assert.match(leer(f), /revalidatePublic\([^)]*SPEAKERS_TAG/, f);
    }
    assert.match(leer("src/app/api/event-config/route.ts"), /revalidateTag\(EVENT_CONFIG_TAG/);
  });

  test("speakers/[slug], /api/evento y llms*.txt ya no se rehacen en cada petición", () => {
    assert.match(leer("src/app/[locale]/speakers/[slug]/page.tsx"), /export const revalidate = 300/);
    for (const f of ["src/app/api/evento/route.ts", "src/app/llms.txt/route.ts", "src/app/llms-full.txt/route.ts"]) {
      assert.match(leer(f), /Cacheado/, f);
    }
  });

  test("el panel arranca con la sesión leída en el servidor", () => {
    assert.match(leer("src/app/[locale]/admin/layout.tsx"), /leerUsuarioInicial/);
    assert.match(leer("src/contexts/auth-context.tsx"), /useState\(!inicial\)/);
  });
});
