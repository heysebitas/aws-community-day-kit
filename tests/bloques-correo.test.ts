import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CATALOGO, aplicarVariables, bloqueNuevo, sanearBloques, type Bloque,
} from "@/emails/bloques";

/** Los bloques de los correos editables. */

describe("variables en los textos", () => {
  test("sustituye las que tienen valor", () => {
    assert.equal(
      aplicarVariables("{nombre}, estás dentro.", { nombre: "Camila" }),
      "Camila, estás dentro.",
    );
  });

  test("las que no tienen valor se van, no se quedan a la vista", () => {
    // Un «{sala}» suelto en la bandeja de entrada se ve roto; la frase sin el
    // dato, no tanto.
    assert.equal(aplicarVariables("Tu sala: {sala}", {}), "Tu sala: ");
  });

  test("sustituye varias, repetidas incluidas", () => {
    assert.equal(
      aplicarVariables("{nombre}, {nombre}: {charla}", { nombre: "Ana", charla: "RAG en AWS" }),
      "Ana, Ana: RAG en AWS",
    );
  });

  test("deja en paz lo que no es una variable", () => {
    assert.equal(aplicarVariables("Precio: $100 {de} verdad", {}), "Precio: $100  verdad");
    assert.equal(aplicarVariables("Sin llaves", { nombre: "Ana" }), "Sin llaves");
  });
});

describe("bloques nuevos", () => {
  test("el catálogo sabe crear todos sus tipos", () => {
    for (const { tipo } of CATALOGO) {
      const b = bloqueNuevo(tipo);
      assert.equal(b.tipo, tipo);
      assert.ok(b.id, `${tipo} debería traer id`);
    }
  });

  test("cada bloque nace con un id distinto", () => {
    const ids = new Set(Array.from({ length: 50 }, () => bloqueNuevo("parrafo").id));
    assert.equal(ids.size, 50);
  });
});

describe("saneado de lo que manda el editor", () => {
  test("descarta tipos que no existen", () => {
    const r = sanearBloques([
      { id: "a", tipo: "parrafo", texto: "vale" },
      { id: "b", tipo: "script", texto: "no vale" },
    ]);
    assert.equal(r.length, 1);
    assert.equal(r[0]!.tipo, "parrafo");
  });

  test("lo que no es una lista no revienta", () => {
    assert.deepEqual(sanearBloques(null), []);
    assert.deepEqual(sanearBloques("texto"), []);
    assert.deepEqual(sanearBloques({ tipo: "parrafo" }), []);
  });

  test("rellena los campos que faltan en vez de dejar undefined", () => {
    const r = sanearBloques([{ tipo: "boton" }]) as Extract<Bloque, { tipo: "boton" }>[];
    assert.equal(r[0]!.texto, "");
    assert.equal(r[0]!.enlace, "");
    assert.equal(r[0]!.contorno, false);
    assert.ok(r[0]!.id, "se le inventa un id si no trae");
  });

  test("recorta los textos largos", () => {
    const r = sanearBloques([{ tipo: "titulo", texto: "x".repeat(5000) }]);
    assert.equal((r[0] as Extract<Bloque, { tipo: "titulo" }>).texto.length, 200);
  });

  test("limpia las filas de una ficha de datos", () => {
    const r = sanearBloques([
      { tipo: "datos", filas: [{ etiqueta: "Fecha", valor: "24 oct" }, null, "basura", { etiqueta: "Lugar" }] },
    ]) as Extract<Bloque, { tipo: "datos" }>[];
    assert.equal(r[0]!.filas.length, 2);
    assert.deepEqual(r[0]!.filas[1], { etiqueta: "Lugar", valor: "" });
  });

  test("quita los pasos vacíos", () => {
    const r = sanearBloques([{ tipo: "pasos", items: ["uno", "", null, "dos"] }]) as Extract<Bloque, { tipo: "pasos" }>[];
    assert.deepEqual(r[0]!.items, ["uno", "dos"]);
  });

  test("pone techo al número de bloques", () => {
    const muchos = Array.from({ length: 200 }, () => ({ tipo: "separador" }));
    assert.equal(sanearBloques(muchos).length, 60);
  });

  test("conserva el orden, que es lo que define el correo", () => {
    const r = sanearBloques([
      { tipo: "titulo", texto: "A" },
      { tipo: "parrafo", texto: "B" },
      { tipo: "boton", texto: "C", enlace: "https://x" },
    ]);
    assert.deepEqual(r.map((b) => b.tipo), ["titulo", "parrafo", "boton"]);
  });
});
