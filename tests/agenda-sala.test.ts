import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolverSala, type BuscarSalon } from "@/lib/agenda-sala";

/** La resolución de la sala de un bloque del programa. */

const SALONES: Record<string, string> = {
  aud: "Auditorio | Piso -1",
  sala2: "Sala 2",
};

/** El buscador de salones, sin base de datos. */
const buscar: BuscarSalon = async (id) => SALONES[id] ?? null;

describe("resolver la sala de un bloque", () => {
  test("con id, el nombre sale del salón y se ignora el texto que venga", async () => {
    // El id manda sobre el nombre: los dos no pueden discrepar.
    const r = await resolverSala("sala2", "Auditorio | Piso -1", buscar);
    assert.equal(r.room, "Sala 2");
    assert.equal(r.roomId, "sala2");
  });

  test("sin id, se conserva el texto escrito a mano", async () => {
    const r = await resolverSala("", "Pasillo del segundo piso", buscar);
    assert.equal(r.room, "Pasillo del segundo piso");
    assert.equal(r.roomId, null);
  });

  test("un id que ya no existe no deja el bloque sin sala", async () => {
    // Si alguien borra el salón, es mejor quedarse con el nombre viejo que
    // mostrar un bloque sin sala.
    const r = await resolverSala("borrado", "Sala 2", buscar);
    assert.equal(r.room, "Sala 2");
    assert.equal(r.roomId, null);
  });

  test("ignora espacios y valores que no son texto", async () => {
    assert.deepEqual(await resolverSala("   ", "Sala 2", buscar), { room: "Sala 2", roomId: null });
    assert.deepEqual(await resolverSala(null, "Sala 2", buscar), { room: "Sala 2", roomId: null });
    assert.deepEqual(await resolverSala(undefined, 42, buscar), { room: "", roomId: null });
  });

  test("sin id ni texto devuelve vacío, para que quien llama lo rechace", async () => {
    const r = await resolverSala(undefined, undefined, buscar);
    assert.equal(r.room, "");
    assert.equal(r.roomId, null);
  });

  test("el id y el nombre viajan con los espacios recortados", async () => {
    const r = await resolverSala(" aud ", "", buscar);
    assert.equal(r.room, "Auditorio | Piso -1");
    assert.equal(r.roomId, "aud");
  });

  test("cambiar de salón cambia las dos cosas a la vez", async () => {
    // La invariante que hacía falta: nombre e id nunca se separan.
    const antes = await resolverSala("aud", "", buscar);
    const despues = await resolverSala("sala2", antes.room, buscar);
    assert.notEqual(despues.room, antes.room);
    assert.notEqual(despues.roomId, antes.roomId);
    assert.equal(despues.room, SALONES[despues.roomId!]);
  });
});
