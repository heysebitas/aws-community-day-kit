import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  aMinutos, rangoValido, sePisan, bloquesEnConflicto, bloquesConHoraInvalida,
  type BloqueHorario,
} from "@/lib/agenda-conflictos";

/** Los choques del programa. */

const bloque = (p: Partial<BloqueHorario> & { _id: string }): BloqueHorario => ({
  title: "Charla", startTime: "10:00", endTime: "10:45", room: "Sala 2", ...p,
});

describe("leer una hora", () => {
  test("convierte «HH:mm» a minutos", () => {
    assert.equal(aMinutos("00:00"), 0);
    assert.equal(aMinutos("10:30"), 630);
    assert.equal(aMinutos("23:59"), 1439);
    assert.equal(aMinutos("9:05"), 545);
  });

  test("rechaza lo que no es una hora", () => {
    for (const malo of ["", "25:00", "10:60", "10", "diez", null, undefined, 1030]) {
      assert.equal(aMinutos(malo), null, `debería rechazar ${JSON.stringify(malo)}`);
    }
  });
});

describe("el tramo de un bloque", () => {
  test("acepta un tramo normal", () => {
    assert.equal(rangoValido("10:00", "10:45"), true);
  });

  test("rechaza que acabe antes de empezar", () => {
    assert.equal(rangoValido("12:00", "11:00"), false);
  });

  test("rechaza que empiece y acabe a la vez", () => {
    assert.equal(rangoValido("10:00", "10:00"), false);
  });

  test("rechaza horas con mala forma", () => {
    assert.equal(rangoValido("10:00", ""), false);
    assert.equal(rangoValido("ayer", "hoy"), false);
  });
});

describe("dos bloques que se pisan", () => {
  test("misma sala y tramos cruzados", () => {
    const a = bloque({ _id: "a", startTime: "10:00", endTime: "11:00" });
    const b = bloque({ _id: "b", startTime: "10:30", endTime: "11:30" });
    assert.equal(sePisan(a, b), true);
    assert.equal(sePisan(b, a), true, "debe dar igual el orden");
  });

  test("uno dentro del otro también se pisan", () => {
    const a = bloque({ _id: "a", startTime: "10:00", endTime: "12:00" });
    const b = bloque({ _id: "b", startTime: "10:30", endTime: "11:00" });
    assert.equal(sePisan(a, b), true);
  });

  test("pegados no es pisarse: es el relevo normal", () => {
    const a = bloque({ _id: "a", startTime: "10:00", endTime: "11:00" });
    const b = bloque({ _id: "b", startTime: "11:00", endTime: "12:00" });
    assert.equal(sePisan(a, b), false);
  });

  test("misma hora en salas distintas no es un choque", () => {
    const a = bloque({ _id: "a", room: "Sala 2" });
    const b = bloque({ _id: "b", room: "Auditorio" });
    assert.equal(sePisan(a, b), false);
  });

  test("la sala se compara sin importar mayúsculas ni espacios", () => {
    const a = bloque({ _id: "a", room: "Sala 2" });
    const b = bloque({ _id: "b", room: " sala 2 " });
    assert.equal(sePisan(a, b), true);
  });

  test("sin sala no se puede afirmar que choquen", () => {
    const a = bloque({ _id: "a", room: "" });
    const b = bloque({ _id: "b", room: "" });
    assert.equal(sePisan(a, b), false);
  });
});

describe("el programa entero", () => {
  test("marca a los dos lados de cada choque", () => {
    const malos = bloquesEnConflicto([
      bloque({ _id: "a", startTime: "10:00", endTime: "11:00" }),
      bloque({ _id: "b", startTime: "10:30", endTime: "11:30" }),
      bloque({ _id: "c", startTime: "12:00", endTime: "13:00" }),
    ]);
    assert.deepEqual([...malos].sort(), ["a", "b"]);
  });

  test("un programa limpio no marca nada", () => {
    const malos = bloquesEnConflicto([
      bloque({ _id: "a", startTime: "10:00", endTime: "11:00" }),
      bloque({ _id: "b", startTime: "11:00", endTime: "12:00" }),
      bloque({ _id: "c", startTime: "10:30", endTime: "11:30", room: "Auditorio" }),
    ]);
    assert.equal(malos.size, 0);
  });

  test("un choque de tres marca a los tres", () => {
    const malos = bloquesEnConflicto([
      bloque({ _id: "a", startTime: "10:00", endTime: "12:00" }),
      bloque({ _id: "b", startTime: "10:30", endTime: "11:00" }),
      bloque({ _id: "c", startTime: "11:30", endTime: "12:30" }),
    ]);
    assert.equal(malos.size, 3);
  });

  test("encuentra los que tienen la hora al revés", () => {
    const malos = bloquesConHoraInvalida([
      bloque({ _id: "a" }),
      bloque({ _id: "b", startTime: "12:00", endTime: "11:00" }),
      bloque({ _id: "c", startTime: "", endTime: "" }),
    ]);
    assert.deepEqual([...malos].sort(), ["b", "c"]);
  });

  test("con un solo bloque nunca hay choque", () => {
    assert.equal(bloquesEnConflicto([bloque({ _id: "a" })]).size, 0);
    assert.equal(bloquesEnConflicto([]).size, 0);
  });
});
