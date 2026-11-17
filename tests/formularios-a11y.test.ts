import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { Field, TextInput, Textarea, PhotoUpload } from "@/app/[locale]/speakers/_components";
import { enfocarPrimerInvalido, type Enfocable } from "@/components/forms/foco";
import es from "@/messages/es.json";

/** Formularios públicos: etiquetas enlazadas, errores, foto con teclado, PIN y foco. */

const RAIZ = path.resolve(__dirname, "..");
const leer = (p: string) => readFileSync(path.join(RAIZ, p), "utf8");
const noop = () => {};

// createElement con hijos variádicos: los tipos de Field exigen `children` como prop.
const crear = createElement as unknown as (tipo: unknown, props: object | null, ...hijos: unknown[]) => React.ReactElement;
const conCampo = (props: { label: string; error?: string; grupo?: boolean }, hijo: React.ReactNode) =>
  crear(Field, props, hijo);

function html(nodo: React.ReactElement): string {
  return renderToStaticMarkup(
    crear(NextIntlClientProvider, { locale: "es", messages: es }, nodo),
  );
}

describe("CFP: etiquetas y errores", () => {
  const marcado = html(
    conCampo({ label: "Título", error: "Obligatorio" }, createElement(TextInput, { value: "", onChange: noop, enterKeyHint: "next" })),
  );

  test("la etiqueta es un <label> enlazado al input por id", () => {
    const para = /<label for="([^"]+)"/.exec(marcado)?.[1];
    const id = /<input[^>]* id="([^"]+)"/.exec(marcado)?.[1];
    assert.ok(para && id, marcado);
    assert.equal(para, id);
  });

  test("el error marca aria-invalid y se enlaza con aria-describedby", () => {
    assert.match(marcado, /aria-invalid="true"/);
    const desc = /aria-describedby="([^"]+)"/.exec(marcado)?.[1];
    assert.ok(desc);
    assert.ok(marcado.includes(`<p id="${desc}"`), marcado);
    assert.match(marcado, /text-error/);
    assert.doesNotMatch(marcado, /text-red-400/);
  });

  test("sin error no hay aria-invalid", () => {
    const ok = html(conCampo({ label: "Título" }, createElement(TextInput, { value: "", onChange: noop })));
    assert.doesNotMatch(ok, /aria-invalid/);
  });

  test("el textarea también se enlaza", () => {
    const m = html(conCampo({ label: "Bio", error: "x" }, createElement(Textarea, { value: "", onChange: noop })));
    assert.match(m, /<label for="([^"]+)"/);
    assert.match(m, /<textarea[^>]* aria-invalid="true"/);
  });

  test("enterKeyHint llega al input", () => {
    assert.match(marcado, /enterkeyhint="next"/i);
  });

  test("un grupo de botones lo nombra la etiqueta, sin <label> huérfano", () => {
    const g = html(conCampo({ label: "Nivel", grupo: true }, createElement("button", { type: "button" }, "x")));
    assert.match(g, /role="group" aria-labelledby="([^"]+)"/);
    assert.doesNotMatch(g, /<label/);
  });
});

describe("CFP: foto con teclado", () => {
  const foto = html(createElement(PhotoUpload, { value: "https://ejemplo.test/f.png", onChange: noop }));

  test("el input de archivo es real, sr-only y está dentro de un <label>", () => {
    assert.match(foto, /<label[^>]*>[\s\S]*<input[^>]*type="file"[^>]*class="sr-only"/);
    assert.doesNotMatch(foto, /class="hidden"/);
  });

  test("el botón de quitar tiene nombre y no hay div con onClick", () => {
    assert.match(foto, /<button[^>]*aria-label="Quitar foto"/);
    assert.doesNotMatch(leer("src/app/[locale]/speakers/_components.tsx"), /<div\s+onClick/);
  });
});

describe("Pasaporte: PIN en un solo campo", () => {
  const piezas = leer("src/app/[locale]/pasaporte/[shortId]/_piezas.tsx");
  const fuente = ["_piezas", "_modales", "_redes", "_use-pasaporte"]
    .map((f) => leer(`src/app/[locale]/pasaporte/[shortId]/${f}.tsx`)).join("\n");
  const pin = piezas.slice(piezas.indexOf("function PinDigits"));

  test("un único input numérico de 4 con one-time-code", () => {
    assert.equal((pin.match(/<input/g) ?? []).length, 1);
    assert.match(pin, /inputMode="numeric"/);
    assert.match(pin, /maxLength=\{4\}/);
    assert.match(pin, /autoComplete="one-time-code"/);
  });

  test("lo pegado se reparte en las cuatro casillas", () => {
    const repartir = (raw: string) => {
      const d = raw.replace(/\D/g, "").slice(0, 4);
      return [0, 1, 2, 3].map((i) => d[i] ?? "");
    };
    assert.deepEqual(repartir("12 34"), ["1", "2", "3", "4"]);
    assert.deepEqual(repartir("98765"), ["9", "8", "7", "6"]);
    assert.ok(pin.includes('.replace(/\\D/g, "").slice(0, 4)'));
  });

  test("el Enter respeta la composición", () => {
    assert.doesNotMatch(fuente, /e\.key === "Enter"\) submitAddSocial/);
    assert.match(fuente, /isComposing/);
  });
});

describe("Foco al primer campo inválido", () => {
  const campo = (nombre: string, log: string[]): Enfocable => ({ focus: () => { log.push(nombre); } });

  test("enfoca sólo el primero, en orden del documento", () => {
    const log: string[] = [];
    const lista = [campo("a", log), campo("b", log)];
    enfocarPrimerInvalido({ querySelectorAll: () => lista });
    assert.deepEqual(log, ["a"]);
  });

  test("sin inválidos o sin raíz no hace nada", () => {
    enfocarPrimerInvalido({ querySelectorAll: () => [] });
    enfocarPrimerInvalido(null);
  });

  test("registro, voluntarios y CFP lo llaman al fallar la validación", () => {
    for (const f of ["registro/_form.tsx", "voluntarios/_use-form.tsx", "speakers/_use-screen.tsx"]) {
      assert.match(leer(`src/app/[locale]/${f}`), /enfocarPrimerInvalido\(/, f);
    }
  });

  test("los campos de registro y voluntarios exponen aria-invalid", () => {
    for (const f of ["registro/_form.tsx", "voluntarios/_bloque-persona.tsx"]) {
      assert.match(leer(`src/app/[locale]/${f}`), /aria-invalid=\{errors\.firstName/, f);
    }
  });
});

describe("Combobox: aria-activedescendant", () => {
  test("SearchSelect y PhoneInput lo declaran", () => {
    for (const f of ["search-select.tsx", "phone-input.tsx"]) {
      assert.match(leer(`src/components/forms/${f}`), /aria-activedescendant/, f);
    }
  });
});
