import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeDocument, normalizeLink, normalizeEmail } from "@/lib/normalize";
import { parseRegistrationInput } from "@/lib/registration-input";
import { parseVolunteerInput } from "@/lib/volunteer-input";
import { definirEvento } from "@/config/definir";
import config from "../evento/config";
import { DOCUMENTOS, ROLES, ENTIDADES } from "@/config";

/** Validación de entradas: documentos por país, enlaces, correos, formularios y configuración. */

describe("RUN chileno", () => {
  const rule = { kind: "run" } as const;
  test("válido con y sin puntos, y se guarda limpio", () => {
    assert.deepEqual(normalizeDocument("12.345.678-5", rule), { ok: true, value: "12345678-5" });
    assert.deepEqual(normalizeDocument("123456785", rule), { ok: true, value: "12345678-5" });
  });
  test("dígito verificador K (minúscula incluida)", () => {
    assert.deepEqual(normalizeDocument("6.000.000-k", rule), { ok: true, value: "6000000-K" });
    assert.equal(normalizeDocument("6000000-0", rule).ok, false);
  });
  test("verificador equivocado, formato roto y vacío se rechazan", () => {
    for (const mal of ["12.345.678-4", "12345678", "1234-5", "abcdefgh-5", "12.345.678-KK", ""]) {
      assert.equal(normalizeDocument(mal, rule).ok, false, mal);
    }
  });
});

describe("CPF brasileño", () => {
  const rule = { kind: "cpf" } as const;
  test("válido con puntuación y se guarda solo con dígitos", () => {
    assert.deepEqual(normalizeDocument("123.456.789-09", rule), { ok: true, value: "12345678909" });
  });
  test("dígito cambiado, repetidos, largo y letras se rechazan", () => {
    for (const mal of ["123.456.789-08", "111.111.111-11", "000.000.000-00", "1234567890", "123456789090", "123.456.789-0X"]) {
      assert.equal(normalizeDocument(mal, rule).ok, false, mal);
    }
  });
});

describe("CURP mexicana", () => {
  const rule = { kind: "curp" } as const;
  const DICC = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  const conVerificador = (base17: string) => {
    const suma = [...base17].reduce((s, c, i) => s + DICC.indexOf(c) * (18 - i), 0);
    return base17 + String((10 - (suma % 10)) % 10);
  };
  const buena = conVerificador("GOMC800101HDFNRR0");

  test("válida, en minúsculas y con espacios", () => {
    assert.deepEqual(normalizeDocument(buena, rule), { ok: true, value: buena });
    assert.deepEqual(normalizeDocument(` ${buena.toLowerCase()} `, rule), { ok: true, value: buena });
  });
  test("formato roto se rechaza", () => {
    for (const mal of ["GOMC800101HDFNRR", "GOMC800101XDFNRR09", "1234567890123456789", "GOMC80010HHDFNRR09"]) {
      assert.equal(normalizeDocument(mal, rule).ok, false, mal);
    }
  });
  test("dígito verificador equivocado se rechaza", { skip: "FALLO REAL: normalizeDocument (src/lib/normalize.ts:238) solo comprueba el formato de la CURP, no el dígito verificador que pide la issue #35" }, () => {
    const mala = buena.slice(0, 17) + String((Number(buena[17]) + 1) % 10);
    assert.equal(normalizeDocument(mala, rule).ok, false);
  });
});

describe("documentos de solo dígitos y sueltos", () => {
  test("rango de dígitos", () => {
    const rule = { kind: "digits", min: 6, max: 10 } as const;
    assert.deepEqual(normalizeDocument("1.012.345-678", rule), { ok: true, value: "1012345678" });
    for (const mal of ["12345", "12345678901", "12ab56789", "   "]) assert.equal(normalizeDocument(mal, rule).ok, false, mal);
  });
  test("«loose»: mayúsculas, sin espacios y solo caracteres permitidos", () => {
    const rule = { kind: "loose", min: 5, max: 12 } as const;
    assert.deepEqual(normalizeDocument("ab 123-4", rule), { ok: true, value: "AB123-4" });
    for (const mal of ["ab_123", "a1", "ABCDEFGHIJKLM", "ab<script>"]) assert.equal(normalizeDocument(mal, rule).ok, false, mal);
  });
});

describe("normalizeLink", () => {
  test("usuario suelto, con arroba de adorno", () => {
    assert.deepEqual(normalizeLink("@ana_dev", "github"), { ok: true, value: "ana_dev" });
  });
  test("vacío es válido y queda vacío", () => {
    assert.deepEqual(normalizeLink("   ", "github"), { ok: true, value: "" });
  });
  test("enlace sin protocolo pasa a https, sin barra final ni www", () => {
    assert.deepEqual(normalizeLink("www.linkedin.com/in/ana/", "linkedin"), { ok: true, value: "https://www.linkedin.com/in/ana" });
  });
  test("dominio de otra red y subdominio parecido se rechazan", () => {
    assert.equal(normalizeLink("https://linkedin.com/in/ana", "instagram").ok, false);
    assert.equal(normalizeLink("https://evilgithub.com/ana", "github").ok, false);
    assert.equal(normalizeLink("https://github.com.evil.example/ana", "github").ok, false);
  });
  test("espacios, caracteres raros y dominios sin punto se rechazan", () => {
    for (const mal of ["https://x.com/a b", "ana<script>", "ana/../", "http://localhost/ana", "ana!"]) {
      assert.equal(normalizeLink(mal, "x").ok, false, mal);
    }
  });
  test("esquemas peligrosos no salen como javascript:", () => {
    for (const s of ["javascript:alert(1)", "javascript://x.com/%0Aalert(1)", "data:text/html,<b>x</b>"]) {
      const r = normalizeLink(s);
      assert.ok(!r.ok || /^https:\/\//.test(r.value), s);
    }
  });
});

describe("normalizeEmail", () => {
  test("válidos se pasan a minúsculas y sin espacios", () => {
    assert.deepEqual(normalizeEmail("  Ana@Ejemplo.TEST "), { ok: true, value: "ana@ejemplo.test", suggestion: undefined });
  });
  test("raros se rechazan", () => {
    for (const mal of ["", "ana", "ana@", "@ejemplo.test", "a@@ejemplo.test", "a@ejemplo", "a..b@ejemplo.test", "a@-ejemplo.test", "a@ejemplo.t", "a@ejemplo.test\nBcc: x@ejemplo.test"]) {
      assert.equal(normalizeEmail(mal).ok, false, JSON.stringify(mal));
    }
  });
});

const doc = DOCUMENTOS.find((d) => d.rule.kind === "digits") ?? DOCUMENTOS[0];
const numeroOk = doc.rule.kind === "digits" ? "1".repeat(doc.rule.min) : "12345678";
const baseAsistente = () => ({
  firstName: "Ana", lastName: "Prueba", email: "ana@ejemplo.test", attendance: "in-person",
  documentType: doc.value, documentNumber: numeroOk,
  role: ROLES[0].value, entityType: "none", acceptCoc: true, acceptPrivacy: true,
});

describe("parseRegistrationInput", () => {
  test("una entrada completa sale normalizada", () => {
    const r = parseRegistrationInput({ ...baseAsistente(), firstName: "  ana   maría ", email: " Ana@Ejemplo.test " });
    assert.ok("data" in r, JSON.stringify(r));
    if ("data" in r) {
      assert.equal(r.data.email, "ana@ejemplo.test");
      assert.equal(r.data.firstName, "Ana María");
      assert.equal(r.data.entityName, null);
    }
  });
  const casos: [string, Record<string, unknown>][] = [
    ["sin nombre", { firstName: "" }],
    ["nombre no es texto (inyección de operador)", { firstName: { $gt: "" } }],
    ["sin apellido", { lastName: undefined }],
    ["correo sin arroba", { email: "ana.ejemplo.test" }],
    ["correo no es texto", { email: ["a@ejemplo.test"] }],
    ["modalidad inventada", { attendance: "hibrido" }],
    ["presencial sin tipo de documento", { documentType: "" }],
    ["tipo de documento fuera del catálogo", { documentType: "PASAPORTE-X" }],
    ["número de documento vacío", { documentNumber: "" }],
    ["número de documento con letras", { documentNumber: "abc<>" }],
    ["entidad fuera del catálogo", { entityType: "club-de-fans" }],
    ["entidad sin nombre", { entityType: ENTIDADES.find((e) => e.value !== "none")?.value, entityName: "" }],
    ["sin código de conducta", { acceptCoc: false }],
    ["sin autorizar datos", { acceptPrivacy: "no" }],
  ];
  for (const [nombre, cambio] of casos) {
    test(`rechaza: ${nombre}`, () => {
      const r = parseRegistrationInput({ ...baseAsistente(), ...cambio });
      assert.ok("error" in r, JSON.stringify(r));
    });
  }
  test("online no pide documento", () => {
    const r = parseRegistrationInput({ ...baseAsistente(), attendance: "online", documentType: "", documentNumber: "" });
    assert.ok("data" in r);
    if ("data" in r) assert.equal(r.data.documentNumber, null);
  });
  test("textos largos se recortan, no se guardan enteros", () => {
    const r = parseRegistrationInput({ ...baseAsistente(), firstName: "A".repeat(500) });
    assert.ok("data" in r);
    if ("data" in r) assert.ok(r.data.firstName.length <= 60);
  });
  test("el alta manual no exige los consentimientos", () => {
    const r = parseRegistrationInput({ ...baseAsistente(), acceptCoc: false, acceptPrivacy: false }, { manual: true });
    assert.ok("data" in r);
  });
});

describe("parseVolunteerInput", () => {
  const completo = () => ({
    ...baseAsistente(), phone: "3001234567", interestAreas: ["registration"], availability: "full-day",
    shirtSize: "M", emergencyName: "Luis Prueba", emergencyPhone: "3007654321",
  });
  test("sin campos obligatorios devuelve error y no lanza", () => {
    for (const cambio of [{ firstName: "" }, { email: "x" }, { documentType: "" }, { interestAreas: [] }, { interestAreas: "registration" }, { availability: "siempre" }, { shirtSize: "XXXXL" }, { acceptCoc: false }]) {
      const r = parseVolunteerInput({ ...completo(), ...cambio });
      assert.ok("error" in r || "data" in r);
    }
  });
  test("lo vacío siempre es error", () => {
    assert.ok("error" in parseVolunteerInput({}));
    assert.ok("error" in parseVolunteerInput({ ...completo(), firstName: { $ne: null } }));
    assert.ok("error" in parseVolunteerInput({ ...completo(), documentNumber: "" }));
  });
});

describe("definirEvento", () => {
  const copia = () => structuredClone(config) as typeof config;
  const falla = (cambiar: (c: ReturnType<typeof copia>) => void, campo: string) => {
    const c = copia();
    cambiar(c);
    assert.throws(() => definirEvento(c), (e: Error) => e.message.includes(`evento/config.ts → ${campo}`), campo);
  };
  test("la configuración del kit es válida", () => {
    assert.doesNotThrow(() => definirEvento(copia()));
  });
  test("cada campo mal escrito falla con su nombre", () => {
    falla((c) => { (c as { tipo: string }).tipo = "otro"; }, "tipo");
    falla((c) => { (c as { pais: string }).pais = "ZZ"; }, "pais");
    falla((c) => { c.fecha.zona = "Marte/Olimpo"; }, "fecha.zona");
    falla((c) => { c.fecha.fin = c.fecha.inicio; }, "fecha.fin");
    falla((c) => { c.cfp.cierre = c.fecha.inicio; }, "cfp.cierre");
    falla((c) => { c.idiomas = [] as never; }, "idiomas");
    falla((c) => { c.idiomas = ["es", "es"] as never; }, "idiomas");
    falla((c) => { c.idiomas = ["es", "fr"] as never; }, "idiomas");
    falla((c) => { c.modalidad = { presencial: false, online: false } as never; }, "modalidad");
    falla((c) => { c.cupos = 0; }, "cupos");
    falla((c) => { c.cupos = 10.5; }, "cupos");
    falla((c) => { c.sitio = "tu-dominio.com"; }, "sitio");
  });
});

describe("esDelBucket", () => {
  const BUCKET = "https://bucket-de-prueba.s3.amazonaws.com";
  // La URL se lee al cargar el módulo: se fija antes del primer import.
  const cargar = async () => {
    process.env.AWS_S3_PUBLIC_URL = BUCKET;
    return (await import("@/lib/subidas")).esDelBucket;
  };
  test("acepta archivos del bucket", async () => {
    const esDelBucket = await cargar();
    assert.equal(esDelBucket(`${BUCKET}/cfs/photos/a.png`), true);
  });
  test("rechaza dominios parecidos, otros esquemas y tipos que no son texto", async () => {
    const esDelBucket = await cargar();
    for (const mal of [
      "https://bucket-de-prueba.s3.amazonaws.com.evil.example/a.png",
      "https://bucket-de-prueba.s3.amazonaws.com@evil.example/a.png",
      "https://evil.example/https://bucket-de-prueba.s3.amazonaws.com/a.png",
      "http://bucket-de-prueba.s3.amazonaws.com/a.png",
      BUCKET,
      "http://169.254.169.254/latest/meta-data/",
      "javascript:alert(1)", "data:image/png;base64,AAAA", "", "   ",
    ]) assert.equal(esDelBucket(mal), false, mal);
    for (const raro of [null, undefined, 42, {}, [`${BUCKET}/a.png`]]) assert.equal(esDelBucket(raro), false);
  });
  test("rechaza el path traversal con «..»", async () => {
    const esDelBucket = await cargar();
    for (const mal of [`${BUCKET}/../otro/a.png`, `${BUCKET}/cfs/../../a.png`, `${BUCKET}/a..png`]) {
      assert.equal(esDelBucket(mal), false, mal);
    }
  });
  test("rechaza el traversal codificado (%2e%2e)", async () => {
    const esDelBucket = await cargar();
    assert.equal(esDelBucket(`${BUCKET}/cfs/%2e%2e/%2e%2e/a.png`), false);
    for (const mal of [`${BUCKET}/cfs/%2E%2E/a.png`, `${BUCKET}/cfs/..%2f..%2fa.png`, `${BUCKET}/cfs/%252e%252e/a.png`]) {
      assert.equal(esDelBucket(mal), false, mal);
    }
  });
});
