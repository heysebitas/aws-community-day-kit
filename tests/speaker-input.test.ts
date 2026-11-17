import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

/** La validación de una postulación de speaker. */

const FOTO = "https://bucket-de-prueba.s3.amazonaws.com/fotos/ana.png";

before(() => {
  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_S3_BUCKET = "bucket-de-prueba";
  process.env.AWS_S3_PUBLIC_URL = "https://bucket-de-prueba.s3.amazonaws.com";
  process.env.AWS_ACCESS_KEY_ID = "AKIAEJEMPLOEJEMPLO00";
  process.env.AWS_SECRET_ACCESS_KEY = "secreto-de-prueba-que-no-abre-nada-000000";
});

async function cuerpoValido(extra: Record<string, unknown> = {}) {
  const { TRACKS } = await import("@/data/session-tracks");
  return {
    firstName: "ana maría", lastName: "pérez", email: "ana@ejemplo.test",
    tagline: "Ingeniera de nube", bio: "Hace nubes.", photo: FOTO,
    talkTitle: "Una charla", talkAbstract: "De qué va.", countryCity: "Ciudad de ejemplo",
    sessionType: "in-person", audienceLevel: "200", language: "es", track: TRACKS[0]!.value,
    ...extra,
  };
}

describe("parseSpeakerInput", () => {
  test("acepta un cuerpo completo y lo limpia", async () => {
    const { parseSpeakerInput } = await import("@/lib/speaker-input");
    const r = parseSpeakerInput(await cuerpoValido({ phone: "+57 300-111 2233", firstTimeSpeaker: true }));
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.value.email, "ana@ejemplo.test");
    assert.equal(r.value.phone, "+573001112233");
    assert.equal(r.value.firstTimeSpeaker, true);
    assert.deepEqual(r.value.coSpeakers, []);
  });

  test("lo que no es un objeto da la lista de campos requeridos", async () => {
    const { parseSpeakerInput } = await import("@/lib/speaker-input");
    for (const crudo of [null, undefined, "texto", 7, [], {}]) {
      const r = parseSpeakerInput(crudo);
      assert.ok(!r.ok);
      if (!r.ok) assert.match(r.error, /^Campos requeridos: firstName, lastName, email/);
    }
  });

  test("nombra cada campo que falta", async () => {
    const { parseSpeakerInput } = await import("@/lib/speaker-input");
    const r = parseSpeakerInput(await cuerpoValido({ email: "no-es-correo", bio: "  ", level: 1, audienceLevel: "999" }));
    assert.ok(!r.ok);
    if (!r.ok) assert.equal(r.error, "Campos requeridos: email, bio, audienceLevel");
  });

  test("una foto que no es del bucket cuenta como ausente", async () => {
    const { parseSpeakerInput } = await import("@/lib/speaker-input");
    const r = parseSpeakerInput(await cuerpoValido({ photo: "https://otro.ejemplo.test/x.png" }));
    assert.ok(!r.ok);
    if (!r.ok) assert.equal(r.error, "Campos requeridos: photo");
  });

  test("los valores que no son texto no rompen nada", async () => {
    const { parseSpeakerInput } = await import("@/lib/speaker-input");
    const r = parseSpeakerInput(await cuerpoValido({ firstName: { $ne: null }, social: "x", coSpeakers: "x" }));
    assert.ok(!r.ok);
    if (!r.ok) assert.equal(r.error, "Campos requeridos: firstName");
  });

  test("copia como mucho 3 co-speakers y descarta los que no son objeto", async () => {
    const { parseSpeakerInput } = await import("@/lib/speaker-input");
    const cs = (n: string) => ({ firstName: n, lastName: "uno", social: { linkedin: "javascript:alert(1)" } });
    const r = parseSpeakerInput(await cuerpoValido({ coSpeakers: [cs("a"), null, cs("b"), cs("c"), cs("d")] }));
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.value.coSpeakers.length, 2);
    assert.equal(r.value.coSpeakers[0]!.social.linkedin, "");
  });

  test("los enlaces inválidos se guardan vacíos", async () => {
    const { parseSpeakerInput } = await import("@/lib/speaker-input");
    const r = parseSpeakerInput(await cuerpoValido({ social: { github: "javascript:alert(1)", blog: 5 } }));
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual([r.value.social.github, r.value.social.blog], ["", ""]);
  });
});

describe("el slug", () => {
  test("une al speaker con sus co-speakers", async () => {
    const { buildSlugFromNames } = await import("@/lib/speaker-input");
    const { toSlug } = await import("@/lib/slug");
    assert.equal(toSlug("  Ána Pérez!! "), "ana-perez");
    assert.equal(buildSlugFromNames("Ana", "Pérez", []), "ana-perez");
    assert.equal(
      buildSlugFromNames("Ana", "Pérez", [{ firstName: "Luis", lastName: "Gómez" }, { firstName: "Eva", lastName: "" }]),
      "ana-perez-luis-gomez-y-eva",
    );
  });
});
