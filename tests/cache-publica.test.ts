import { after, before, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import Module from "node:module";
import type { GET as GetAgenda } from "@/app/api/agenda/route";
import type { GET as GetFaq } from "@/app/api/faq/route";
import type { getPublicSpeakerBySlug as GetSpeaker } from "@/lib/data/speakers";
import { connectDB } from "@/lib/db";
import { AgendaEvent } from "@/models/agenda-event";
import { FAQ } from "@/models/faq";
import { SpeakerProfile } from "@/models/speaker-profile";

// Fuera de Next `unstable_cache` no tiene almacén: lo sustituimos por un Map con tags,
// que es lo que necesitamos para contar consultas.
type Entrada = { valor: unknown; tags: string[] };
let pedidosDeAcceso = 0;
const almacen = new Map<string, Entrada>();
const cargar = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: unknown })._load = function (this: unknown, pedido: unknown, ...resto: unknown[]) {
  const real = cargar.call(this, pedido, ...resto) as Record<string, unknown>;
  if (typeof pedido === "string" && /(^@\/lib\/auth$|\/lib\/auth(\.ts)?$)/.test(pedido)) {
    return { ...real, requireAccess: async () => { pedidosDeAcceso += 1; throw new Error("Unauthorized"); } };
  }
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

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

describe("caché de las APIs públicas", () => {
  let servidor: MongoMemoryServer;
  let agenda: typeof GetAgenda;
  let faq: typeof GetFaq;
  let getPublicSpeakerBySlug: typeof GetSpeaker;

  before(async () => {
    ({ GET: agenda } = await import("@/app/api/agenda/route"));
    ({ GET: faq } = await import("@/app/api/faq/route"));
    ({ getPublicSpeakerBySlug } = await import("@/lib/data/speakers"));
    servidor = await MongoMemoryServer.create();
    process.env.MONGODB_URI = servidor.getUri("community-day");
    await connectDB();
    await FAQ.create({ questionEs: "¿Dónde?", answerEs: "Aquí", questionEn: "Where?", answerEn: "Here", isActive: true });
    await AgendaEvent.create({ title: "Charla", startTime: "09:00", endTime: "09:30", room: "Sala A" });
    await SpeakerProfile.create({
      name: "Ana Ejemplo", slug: "ana-ejemplo", isPublic: true, email: "ana@example.test",
      talkTitle: "Charla", track: "general",
    });
  });

  after(async () => {
    mock.restoreAll();
    await mongoose.disconnect();
    await servidor.stop();
    delete process.env.MONGODB_URI;
  });

  test("agenda: con la caché caliente no consulta Mongo y lleva Cache-Control", async () => {
    await agenda();
    const find = mock.method(AgendaEvent, "find");
    const res = await agenda();
    const cuerpo = await res.json() as { events: { title: string }[] };
    assert.equal(find.mock.calls.length, 0);
    assert.equal(res.headers.get("Cache-Control"), CACHE);
    assert.equal(cuerpo.events[0].title, "Charla");
    find.mock.restore();
  });

  test("faq pública: sin consulta con caché caliente y con Cache-Control", async () => {
    const peticion = () => faq(new NextRequest("http://localhost/api/faq"));
    await peticion();
    const find = mock.method(FAQ, "find");
    const res = await peticion();
    assert.equal(find.mock.calls.length, 0);
    assert.equal(res.headers.get("Cache-Control"), CACHE);
    find.mock.restore();
  });

  test("revalidatePublic invalida la caché de la FAQ", async () => {
    const { revalidatePublic, FAQ_TAG } = await import("@/lib/data/revalidate");
    await FAQ.create({ questionEs: "Nueva", answerEs: "x", questionEn: "New", answerEn: "x", isActive: true, order: 9 });
    const antes = await (await faq(new NextRequest("http://localhost/api/faq"))).json() as { faqs: unknown[] };
    revalidatePublic(FAQ_TAG);
    const despues = await (await faq(new NextRequest("http://localhost/api/faq"))).json() as { faqs: unknown[] };
    assert.equal(despues.faqs.length, antes.faqs.length + 1);
  });

  test("faq all=true sigue pidiendo sesión y no se cachea", async () => {
    const antes = pedidosDeAcceso;
    const res = await faq(new NextRequest("http://localhost/api/faq?all=true"));
    assert.equal(pedidosDeAcceso, antes + 1);
    assert.equal(res.status, 401);
    assert.notEqual(res.headers.get("Cache-Control"), CACHE);
  });

  test("speaker por slug: metadata y página comparten una consulta", async () => {
    const findOne = mock.method(SpeakerProfile, "findOne");
    const a = await getPublicSpeakerBySlug("ana-ejemplo");
    const b = await getPublicSpeakerBySlug("ana-ejemplo");
    assert.equal(a?.name, "Ana Ejemplo");
    assert.equal(b?.name, "Ana Ejemplo");
    assert.ok(findOne.mock.calls.length <= 1, `consultas: ${findOne.mock.calls.length}`);
    findOne.mock.restore();
    const otra = mock.method(SpeakerProfile, "findOne");
    await getPublicSpeakerBySlug("ana-ejemplo");
    assert.equal(otra.mock.calls.length, 0);
    assert.equal(JSON.stringify(a).includes("ana@example.test"), false);
  });
});
