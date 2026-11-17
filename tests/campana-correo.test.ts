import { EVENTO } from "@/config";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { armarDesdePlantilla, valoresDelEvento } from "@/lib/email-plantillas";
import { SEMILLAS } from "@/emails/semilla";

/** El correo que sale de una campaña. */

const plantilla = () => {
  const s = SEMILLAS.find((x) => x.slug === "speaker_aprobado")!;
  return { asunto: s.asunto, preview: s.preview, bloques: s.bloques };
};

const camila = {
  nombre: "Camila",
  nombreCompleto: "Camila Rojas Vergara",
  correo: "camila@ejemplo.cl",
  charla: "Observabilidad sin morir en el intento",
  modalidad: "Presencial",
};

describe("armar el correo de una persona", () => {
  test("pone su nombre y su charla", async () => {
    const c = await armarDesdePlantilla(plantilla(), camila, ["presencial", "nacional"]);
    assert.ok(c.html.includes("Camila"), "falta el nombre");
    assert.ok(c.html.includes("Observabilidad sin morir en el intento"), "falta la charla");
  });

  test("no deja ninguna variable a la vista", async () => {
    const c = await armarDesdePlantilla(plantilla(), camila, ["presencial", "nacional"]);
    const sueltas = [...c.html.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[0]);
    assert.deepEqual(sueltas, [], `quedaron variables sin valor: ${sueltas.join(", ")}`);
  });

  test("el asunto también pasa por las variables", async () => {
    const c = await armarDesdePlantilla(
      { asunto: "Hola {nombre}, sobre {charla}", bloques: [] },
      camila,
    );
    assert.equal(c.asunto, "Hola Camila, sobre Observabilidad sin morir en el intento");
  });

  test("los datos del evento salen solos, sin pasárselos", async () => {
    const { evento, sede } = valoresDelEvento();
    const c = await armarDesdePlantilla(
      { asunto: "{evento}", bloques: [{ id: "a", tipo: "parrafo", texto: "en {sede}" }] },
      {},
    );
    assert.equal(c.asunto, evento);
    assert.ok(c.html.includes(sede!));
  });

  test("quien no tiene un dato no recibe la variable cruda", async () => {
    // Un voluntario no tiene charla: el correo no puede salir con «{charla}» escrito.
    const c = await armarDesdePlantilla(
      { asunto: "x", bloques: [{ id: "a", tipo: "parrafo", texto: "Tu charla: {charla}." }] },
      { nombre: "Ana" },
    );
    assert.ok(!c.html.includes("{charla}"));
  });
});

describe("el mismo correo para dos personas distintas", () => {
  test("al presencial le llega la dirección y al online no", async () => {
    const pres = await armarDesdePlantilla(plantilla(), camila, ["presencial", "nacional"]);
    const onl = await armarDesdePlantilla(
      plantilla(),
      { ...camila, modalidad: "Track Online (en vivo)" },
      ["online", "nacional"],
    );

    assert.ok(pres.html.includes(EVENTO.sede.direccion), "el presencial necesita la dirección");
    assert.ok(!onl.html.includes(EVENTO.sede.direccion), "al online no se le manda la dirección");
    assert.ok(onl.html.includes("Track Online"), "al online hay que decirle que es online");
  });

  test("al de fuera le llega el párrafo de la carta y al de acá no", async () => {
    const fuera = await armarDesdePlantilla(plantilla(), camila, ["presencial", "internacional"]);
    const aca = await armarDesdePlantilla(plantilla(), camila, ["presencial", "nacional"]);
    assert.ok(fuera.html.includes("visado"));
    assert.ok(!aca.html.includes("visado"));
  });

  test("ninguna de las cuatro combinaciones se queda sin cuerpo", async () => {
    for (const banderas of [
      ["presencial", "nacional"], ["presencial", "internacional"],
      ["online", "nacional"], ["online", "internacional"],
    ]) {
      const c = await armarDesdePlantilla(plantilla(), camila, banderas);
      assert.ok(c.html.length > 2000, `${banderas.join("+")} sale casi vacío`);
      assert.ok(c.asunto.trim(), `${banderas.join("+")} sale sin asunto`);
    }
  });

  test("cabe en Gmail sin que lo recorte", async () => {
    // Gmail corta por encima de ~102 KB y enseña «mensaje recortado»; el
    // enlace de bajas y el pie se quedarían fuera.
    const c = await armarDesdePlantilla(plantilla(), camila, ["presencial", "internacional"]);
    const kb = Buffer.byteLength(c.html) / 1024;
    assert.ok(kb < 102, `son ${kb.toFixed(1)} KB`);
  });
});
