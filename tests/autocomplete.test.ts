import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const leer = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** Las etiquetas `<input …>` del fichero, con su `id`. */
function inputs(src: string) {
  return [...src.matchAll(/<input\b[\s\S]*?\/?>/g)].map((m) => ({
    texto: m[0],
    id: m[0].match(/\bid="([^"]+)"/)?.[1] ?? "",
  }));
}

// Campo (id) → token que le toca.
const PERSONALES: Record<string, Record<string, string>> = {
  "src/app/[locale]/registro/_form.tsx": {
    "f-name": "given-name", "f-last": "family-name", "f-mail": "email", "f-entn": "organization",
  },
  "src/app/[locale]/voluntarios/_bloque-persona.tsx": {
    "v-name": "given-name", "v-last": "family-name", "v-mail": "email", "v-entn": "organization",
  },
  "src/app/[locale]/voluntarios/_bloque-evento.tsx": {},
  "src/app/[locale]/voluntarios/_bloque-cierre.tsx": {},
};

describe("autocomplete de los datos personales", () => {
  for (const [fichero, campos] of Object.entries(PERSONALES)) {
    const encontrados = inputs(leer(fichero));
    for (const [id, token] of Object.entries(campos)) {
      it(`${fichero}: #${id} lleva autoComplete="${token}" y name`, () => {
        const c = encontrados.find((i) => i.id === id);
        assert.ok(c, `no hay un input con id ${id}`);
        assert.ok(c.texto.includes(`autoComplete="${token}"`), `falta autoComplete="${token}"`);
        assert.match(c.texto, /\bname="/);
      });
    }
    it(`${fichero}: ningún input con id queda sin autoComplete explícito`, () => {
      for (const i of encontrados.filter((x) => x.id)) {
        assert.match(i.texto, /autoComplete=/, `#${i.id} sin autoComplete`);
      }
    });
  }

  it("el teléfono propio es tel-national y el de emergencia no se autocompleta", () => {
    const src = leer("src/components/forms/phone-input.tsx");
    assert.match(src, /autoComplete = "tel-national"/);
    assert.match(src, /autoComplete=\{autoComplete\}/);
    const vol = leer("src/app/[locale]/voluntarios/_bloque-evento.tsx");
    assert.match(vol, /<PhoneInput\s+label=\{t\.emergencyPhone\}\s+autoComplete="off"/);
  });

  it("el CFP ya no fuerza autoComplete=off en TextInput", () => {
    const src = leer("src/app/[locale]/speakers/_components.tsx");
    assert.doesNotMatch(src, /autoComplete \?\? "off"/);
    assert.match(src, /autoComplete=\{autoComplete\}/);
  });
});

describe("globals.css", () => {
  const css = leer("src/app/globals.css");
  it("no queda color-mix con tinta o papel", () => {
    assert.doesNotMatch(css, /color-mix\([^)]*--color-(tinta|papel)/);
  });
  it("declara las variables -rgb y el respaldo de forced-colors", () => {
    assert.match(css, /--tinta-rgb:\s*0 0 0/);
    assert.match(css, /--papel-rgb:\s*255 255 255/);
    assert.match(css, /@media \(forced-colors: active\)/);
    assert.match(css, /border: 2px solid transparent/);
  });
});
