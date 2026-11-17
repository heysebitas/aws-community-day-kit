import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { IDIOMAS } from "@/config";
import { tokensDe } from "@/i18n/tokens";

/** Los textos del sitio (`src/messages/*.json`). */

type Arbol = Record<string, Record<string, string>>;

const RAIZ = path.resolve(__dirname, "..");
const leer = (idioma: string): Arbol =>
  JSON.parse(fs.readFileSync(path.join(RAIZ, "src/messages", `${idioma}.json`), "utf8"));

const DISPONIBLES = fs
  .readdirSync(path.join(RAIZ, "src/messages"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

const claves = (a: Arbol) => Object.entries(a).flatMap(([ns, v]) => Object.keys(v).map((k) => `${ns}.${k}`)).sort();

describe("los idiomas", () => {
  test("cada idioma de la edición tiene su archivo", () => {
    for (const i of IDIOMAS) assert.ok(DISPONIBLES.includes(i), `falta src/messages/${i}.json`);
  });

  test("todos los archivos traen las mismas claves", () => {
    const base = claves(leer("es"));
    for (const i of DISPONIBLES) {
      const otras = new Set(claves(leer(i)));
      const faltan = base.filter((k) => !otras.has(k));
      const sobran = [...otras].filter((k) => !base.includes(k));
      assert.deepEqual({ faltan, sobran }, { faltan: [], sobran: [] }, `${i}.json no coincide con es.json`);
    }
  });
});

describe("los datos de la edición dentro de los textos", () => {
  test("todos los [[tokens]] existen", () => {
    const conocidos = new Set(Object.keys(tokensDe("es")));
    for (const i of DISPONIBLES) {
      for (const [ns, v] of Object.entries(leer(i))) {
        for (const [k, texto] of Object.entries(v)) {
          for (const m of String(texto).matchAll(/\[\[([a-z_]+)\]\]/g)) {
            assert.ok(conocidos.has(m[1]!), `${i}.json → ${ns}.${k} usa [[${m[1]}]], que no existe`);
          }
        }
      }
    }
  });

  test("ningún texto lleva escrito el año", () => {
    // Un año escrito a mano es un texto que queda viejo en la edición siguiente.
    for (const i of DISPONIBLES) {
      for (const [ns, v] of Object.entries(leer(i))) {
        for (const [k, texto] of Object.entries(v)) {
          assert.doesNotMatch(String(texto), /\b20[2-9]\d\b/, `${i}.json → ${ns}.${k} lleva un año escrito: usa [[anio]]`);
        }
      }
    }
  });
});

describe("lo que piden las pantallas", () => {
  const archivos: string[] = [];
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (/\.tsx?$/.test(e.name)) archivos.push(p);
    }
  };
  recorrer(path.join(RAIZ, "src"));

  test("cada t(\"clave\") está en los mensajes", () => {
    const mensajes = leer("es");
    const faltan: string[] = [];

    for (const archivo of archivos) {
      const codigo = fs.readFileSync(archivo, "utf8");
      // const t = useTranslations("Ns")  ·  const t = await getTranslations({ locale, namespace: "Ns" })
      const traductores = [
        ...codigo.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?"(\w+)"/g),
      ];
      for (const [, variable, ns] of traductores) {
        const espacio = mensajes[ns!];
        if (!espacio) {
          faltan.push(`${path.relative(RAIZ, archivo)}: el espacio «${ns}» no existe`);
          continue;
        }
        const usos = codigo.matchAll(new RegExp(`(?<![\\w.])${variable}(?:\\.rich|\\.raw)?\\(\\s*"([\\w.]+)"`, "g"));
        for (const [, clave] of usos) {
          if (!(clave! in espacio)) faltan.push(`${path.relative(RAIZ, archivo)}: ${ns}.${clave}`);
        }
      }
    }

    assert.deepEqual(faltan, []);
  });
});
