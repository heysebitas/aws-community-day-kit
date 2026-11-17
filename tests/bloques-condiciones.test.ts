import { EVENTO } from "@/config";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BANDERAS, bloquesVisibles, sanearBloques, type Bloque } from "@/emails/bloques";
import { SEMILLAS } from "@/emails/semilla";
import { SISTEMA } from "@/models/email-template";

/** Los bloques condicionales. */

const b = (id: string, mostrarSi?: string): Bloque =>
  ({ id, tipo: "parrafo", texto: id, ...(mostrarSi ? { mostrarSi } : {}) }) as Bloque;

describe("qué bloques ve cada destinatario", () => {
  test("los que no tienen condición salen siempre", () => {
    const r = bloquesVisibles([b("a"), b("b")], []);
    assert.deepEqual(r.map((x) => x.id), ["a", "b"]);
  });

  test("los condicionados sólo con su bandera levantada", () => {
    const lista = [b("comun"), b("soloPres", "presencial"), b("soloOnline", "online")];
    assert.deepEqual(bloquesVisibles(lista, ["presencial"]).map((x) => x.id), ["comun", "soloPres"]);
    assert.deepEqual(bloquesVisibles(lista, ["online"]).map((x) => x.id), ["comun", "soloOnline"]);
  });

  test("sin banderas sólo quedan los comunes", () => {
    const lista = [b("comun"), b("soloPres", "presencial")];
    assert.deepEqual(bloquesVisibles(lista, []).map((x) => x.id), ["comun"]);
  });

  test("varias banderas a la vez", () => {
    const lista = [b("pres", "presencial"), b("intl", "internacional"), b("on", "online")];
    assert.deepEqual(
      bloquesVisibles(lista, ["presencial", "internacional"]).map((x) => x.id),
      ["pres", "intl"],
    );
  });

  test("conserva el orden original", () => {
    const lista = [b("1"), b("2", "online"), b("3"), b("4", "online")];
    assert.deepEqual(bloquesVisibles(lista, ["online"]).map((x) => x.id), ["1", "2", "3", "4"]);
  });
});

describe("saneado de la condición", () => {
  test("acepta las del catálogo", () => {
    for (const f of BANDERAS) {
      const r = sanearBloques([{ tipo: "parrafo", texto: "x", mostrarSi: f.clave }]);
      assert.equal(r[0]!.mostrarSi, f.clave);
    }
  });

  test("descarta una bandera inventada en vez de esconder el bloque para siempre", () => {
    const r = sanearBloques([{ tipo: "parrafo", texto: "x", mostrarSi: "jueves" }]);
    assert.equal(r[0]!.mostrarSi, undefined);
    assert.equal(bloquesVisibles(r, []).length, 1, "debe seguir saliendo");
  });
});

describe("las plantillas de sistema", () => {
  test("hay una semilla por cada clave que el código busca", () => {
    for (const slug of Object.keys(SISTEMA)) {
      assert.ok(SEMILLAS.some((s) => s.slug === slug), `falta la semilla de ${slug}`);
    }
  });

  test("toda semilla de sistema tiene su clave en SISTEMA", () => {
    // Sólo las de sistema: las de campaña vienen sembradas pero las manda una
    // persona, con una clave propia que el código no busca.
    for (const s of SEMILLAS.filter((x) => x.deSistema !== false)) {
      assert.ok(s.slug in SISTEMA, `${s.slug} no está en SISTEMA`);
    }
  });

  test("una semilla de campaña trae audiencia y no está en SISTEMA", () => {
    // Las dos mitades del trato: sin audiencia el botón de enviar no sabría a
    // quién, y con una clave de SISTEMA el código la dispararía por su cuenta.
    for (const s of SEMILLAS.filter((x) => x.deSistema === false)) {
      assert.ok(!(s.slug in SISTEMA), `${s.slug} es de campaña pero está en SISTEMA`);
      assert.ok(s.audiencia?.length, `${s.slug} es de campaña y no tiene audiencia`);
    }
  });

  test("no hay dos semillas con la misma clave", () => {
    // Dos con el mismo slug se sembrarían como una sola y la segunda se
    // perdería en silencio.
    const vistas = new Set<string>();
    for (const s of SEMILLAS) {
      assert.ok(!vistas.has(s.slug), `${s.slug} está repetida`);
      vistas.add(s.slug);
    }
  });

  test("todas traen asunto y al menos un bloque", () => {
    for (const s of SEMILLAS) {
      assert.ok(s.asunto.trim(), `${s.slug} sin asunto`);
      assert.ok(s.bloques.length > 0, `${s.slug} sin bloques`);
    }
  });

  test("sus bloques pasan el saneado sin perderse", () => {
    // Si una semilla trae algo que el saneado descarta, la plantilla nacería
    // distinta de como está escrita acá.
    for (const s of SEMILLAS) {
      assert.equal(
        sanearBloques(s.bloques).length,
        s.bloques.length,
        `${s.slug} pierde bloques al sanear`,
      );
    }
  });

  test("el correo de aprobación cubre presencial y online sin dejar hueco", () => {
    const aprobado = SEMILLAS.find((s) => s.slug === "speaker_aprobado")!;
    const pres = bloquesVisibles(aprobado.bloques, ["presencial", "nacional"]);
    const onl = bloquesVisibles(aprobado.bloques, ["online", "nacional"]);
    assert.ok(pres.length > 0 && onl.length > 0);
    assert.notDeepEqual(pres.map((x) => x.id), onl.map((x) => x.id));
    // Al de online no se le manda la dirección del recinto.
    const textoOnline = JSON.stringify(onl);
    assert.ok(!textoOnline.includes(EVENTO.sede.direccion), "el online no debe recibir la dirección");
  });
});
