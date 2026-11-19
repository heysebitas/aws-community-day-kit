import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { esModesto, SCRIPT_MODESTO } from "@/lib/dispositivo";

describe("esModesto", () => {
  test("falso en el servidor (sin navigator)", () => {
    const d = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", { value: undefined, configurable: true });
    try {
      assert.equal(esModesto(), false);
    } finally {
      if (d) Object.defineProperty(globalThis, "navigator", d);
    }
  });
  test("falso con un equipo potente", () =>
    assert.equal(esModesto({ deviceMemory: 8, hardwareConcurrency: 8, connection: { effectiveType: "4g" } }), false));
  test("memoria de 2 GB o menos", () => assert.equal(esModesto({ deviceMemory: 2 }), true));
  test("4 núcleos o menos", () => assert.equal(esModesto({ hardwareConcurrency: 4 }), true));
  test("ahorro de datos", () => assert.equal(esModesto({ connection: { saveData: true } }), true));
  for (const t of ["slow-2g", "2g", "3g"])
    test(`red ${t}`, () => assert.equal(esModesto({ connection: { effectiveType: t } }), true));
  test("sin datos del navegador no es modesto", () => assert.equal(esModesto({}), false));
});

describe("SCRIPT_MODESTO", () => {
  const correr = (n: object) => {
    const clases = new Set<string>();
    const doc = { documentElement: { classList: { add: (c: string) => clases.add(c) } } };
    new Function("navigator", "document", `return ${SCRIPT_MODESTO}`)(n, doc);
    return clases.has("modesto");
  };
  const casos: [string, object][] = [
    ["potente", { deviceMemory: 8, hardwareConcurrency: 8, connection: { effectiveType: "4g" } }],
    ["memoria", { deviceMemory: 2, hardwareConcurrency: 8 }],
    ["núcleos", { hardwareConcurrency: 4 }],
    ["ahorro", { hardwareConcurrency: 8, connection: { saveData: true } }],
    ["3g", { hardwareConcurrency: 8, connection: { effectiveType: "3g" } }],
    ["slow-2g", { hardwareConcurrency: 8, connection: { effectiveType: "slow-2g" } }],
    ["sin datos", {}],
  ];
  for (const [nombre, n] of casos)
    test(`coincide con esModesto: ${nombre}`, () =>
      assert.equal(correr(n), esModesto(n)));
});
