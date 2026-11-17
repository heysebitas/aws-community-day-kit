import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { armarDesdePlantilla } from "@/lib/email-plantillas";
import { valoresDelEvento } from "@/emails/valores-evento";
import { SEMILLAS } from "@/emails/semilla";
import { valoresDeLaPropuesta } from "@/lib/correo-propuesta";
import { INVITACION, PASAPORTE, PROPUESTA, CERTIFICADO, textoVisible } from "./fixtures/correos-tsx/datos";

/**
 * Los cuatro correos que eran componentes TSX ahora son plantillas de bloques.
 * El fixture guarda lo que producían antes: el texto que ve quien lee y sus enlaces.
 */
const fixture = (n: string, ext: "txt" | "html") =>
  readFileSync(new URL(`./fixtures/correos-tsx/${n}.${ext}`, import.meta.url), "utf8");

const semilla = (slug: string) => {
  const s = SEMILLAS.find((x) => x.slug === slug);
  assert.ok(s, `falta la semilla ${slug}`);
  return s;
};

const enlaces = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).sort();

async function armar(slug: string, valores: Record<string, string>, banderas: string[] = []) {
  return armarDesdePlantilla(semilla(slug), valores, banderas);
}

const primerNombre = (n: string) => n.split(" ")[0]!;

const casos: { nombre: string; fixture: string; slug: string; valores: Record<string, string>; banderas?: string[] }[] = [
  {
    nombre: "invitación al panel",
    fixture: "invitacion",
    slug: "invitacion_panel",
    valores: {
      nombre: primerNombre(INVITACION.name),
      nombreCompleto: INVITACION.name,
      rol: "Organizador",
      enlaceClave: INVITACION.createPasswordUrl,
    },
  },
  {
    nombre: "confirmar cambios del pasaporte",
    fixture: "pasaporte",
    slug: "pasaporte_confirmar",
    valores: {
      nombre: primerNombre(PASAPORTE.name),
      enlaceConfirmar: PASAPORTE.confirmUrl,
      linkedin: "https://linkedin.com/in/luis-muestra",
      foto: "actualizada",
    },
  },
  {
    nombre: "postulación de speaker",
    fixture: "propuesta",
    slug: "speaker_postulacion",
    valores: {
      nombre: PROPUESTA.firstName,
      ...valoresDeLaPropuesta({
        talkTitle: PROPUESTA.talkTitle, talkAbstract: PROPUESTA.talkAbstract,
        sessionType: PROPUESTA.sessionType, audienceLevel: PROPUESTA.audienceLevel,
        track: PROPUESTA.track, language: PROPUESTA.language, countryCity: PROPUESTA.countryCity,
        tagline: PROPUESTA.tagline, requirements: PROPUESTA.requirements,
        coSpeakerNames: PROPUESTA.coSpeakerNames,
      }),
    },
    banderas: ["presencial"],
  },
  {
    nombre: "certificado de voluntariado",
    fixture: "certificado",
    slug: "voluntario_certificado",
    valores: { nombre: primerNombre(CERTIFICADO.name), nombreCompleto: CERTIFICADO.name },
  },
];

describe("los cuatro correos que eran TSX", () => {
  for (const c of casos) {
    test(`${c.nombre}: mismo texto visible que antes`, async () => {
      const { html } = await armar(c.slug, c.valores, c.banderas);
      assert.equal(textoVisible(html), fixture(c.fixture, "txt").trim());
    });

    test(`${c.nombre}: los mismos enlaces que antes`, async () => {
      const { html } = await armar(c.slug, c.valores, c.banderas);
      assert.deepEqual(enlaces(html), enlaces(fixture(c.fixture, "html")));
    });
  }

  test("el pasaporte sólo enseña las filas que cambian", async () => {
    const { html } = await armar("pasaporte_confirmar", { nombre: "Luis", enlaceConfirmar: "https://ejemplo.test/x", github: "luis" });
    const texto = textoVisible(html);
    assert.match(texto, /GitHub luis/);
    assert.doesNotMatch(texto, /LinkedIn|TikTok|Builder Center/);
  });

  test("la copia de la propuesta omite track, co-speakers y requerimientos si no hay", () => {
    const v = valoresDeLaPropuesta({
      talkTitle: "T", talkAbstract: "A", sessionType: "online", audienceLevel: "expert",
      language: "en", countryCity: "C", tagline: "R",
    });
    assert.equal(v.track, "");
    assert.equal(v.coSpeakers, "");
    assert.equal(v.requerimientos, "");
    assert.equal(v.modalidad, "Online — sesión virtual");
  });

  test("el asunto sale de la plantilla y lleva el evento", async () => {
    for (const slug of ["invitacion_panel", "pasaporte_confirmar", "voluntario_certificado"]) {
      const { asunto } = await armar(slug, {});
      assert.ok(asunto.length > 10 && !asunto.includes("{"), `${slug}: ${asunto}`);
    }
  });
});

describe("saludo sin nombre", () => {
  test("la invitación sin nombre usa el texto alternativo", async () => {
    const c = await armar("invitacion_panel", { nombre: "", nombreCompleto: "", rol: "Organizador", enlaceClave: "https://ejemplo.test/x" });
    const texto = c.html.replace(/<[^>]+>/g, " ");
    assert.match(texto, /Tu cuenta está lista\./);
    assert.doesNotMatch(texto, /Bienvenido\/a, \./);
  });

  test("con nombre se conserva el saludo", async () => {
    const c = await armar("invitacion_panel", { nombre: "Ana", rol: "Organizador", enlaceClave: "https://ejemplo.test/x" });
    assert.match(c.html, /Bienvenido\/a, Ana\./);
  });

  test("siVacio funciona en cualquier título y párrafo", async () => {
    const c = await armarDesdePlantilla({
      asunto: "x",
      bloques: [
        { id: "a", tipo: "titulo", texto: "Hola, {nombre}.", siVacio: "Hola." },
        { id: "b", tipo: "parrafo", texto: "Para {nombre}.", siVacio: "Para ti." },
      ],
    }, { nombre: "  " });
    assert.match(c.html, />Hola\.</);
    assert.match(c.html, />Para ti\.</);
  });
});

describe("plantilla desactivada", () => {
  let servidor: import("mongodb-memory-server").MongoMemoryServer;
  let mongoose: typeof import("mongoose").default;

  before(async () => {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    mongoose = (await import("mongoose")).default;
    servidor = await MongoMemoryServer.create();
    process.env.MONGODB_URI = servidor.getUri("correos");
    await mongoose.connect(process.env.MONGODB_URI);
  });
  after(async () => {
    await mongoose.disconnect();
    await servidor.stop();
  });

  for (const slug of ["invitacion_panel", "voluntario_certificado"] as const) {
    test(`${slug}: desactivada o borrada usa el texto de fábrica`, async () => {
      const { armarCorreoObligatorio, armarCorreo } = await import("@/lib/email-plantillas");
      const { EmailTemplate } = await import("@/models/email-template");
      const valores = { nombre: "Ana", nombreCompleto: "Ana Prueba", rol: "Organizador", enlaceClave: "https://ejemplo.test/x" };

      assert.ok(await armarCorreoObligatorio(slug, valores));
      await EmailTemplate.updateOne({ slug }, { $set: { activa: false } });
      assert.equal(await armarCorreo(slug, valores), null);
      const apagada = await armarCorreoObligatorio(slug, valores);
      assert.equal(apagada.asunto, aplicar(semilla(slug).asunto, { ...valoresDelEvento(), ...valores }));
      assert.ok(apagada.html.length > 500);

      await EmailTemplate.deleteOne({ slug });
      const borrada = await armarCorreoObligatorio(slug, valores);
      assert.equal(borrada.asunto, apagada.asunto);
    });
  }
});

function aplicar(t: string, v: Record<string, string>) {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");
}
