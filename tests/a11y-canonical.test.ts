import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { SITIO, IDIOMAS } from "@/config";
import { localePath } from "@/lib/utils";
import { resolver, tokensDe } from "@/i18n/tokens";
import type { Idioma } from "@/config/tipos";

/**
 * Accesibilidad funcional y canonical de las páginas públicas.
 *
 * - El nombre accesible del selector de idioma tiene que empezar por el texto
 *   que se ve (regla `label-content-name-mismatch`).
 * - Una lista ordenada sólo vale si sus hijos directos son `<li>`.
 * - Las páginas legales tienen su propio canonical y sus traducciones: si no,
 *   heredan los de la portada.
 */

const RAIZ = path.resolve(__dirname, "..");
const cargar = createRequire(__filename);

type Mensajes = Record<string, Record<string, string>>;

function mensajesDe(idioma: string): Mensajes {
  const crudos = JSON.parse(readFileSync(path.join(RAIZ, "src/messages", `${idioma}.json`), "utf8"));
  return resolver(crudos, tokensDe(idioma as Idioma));
}

/** Sustituye un módulo por otro: aquí los de Next, que no existen fuera de él. */
function poner(modulo: string, exports: Record<string, unknown>): void {
  const ruta = cargar.resolve(modulo);
  cargar.cache[ruta] = {
    id: ruta,
    filename: ruta,
    loaded: true,
    exports,
  } as unknown as NodeModule;
}

// `next-intl` fuera de Next no encuentra su configuración de request, así que
// se le da un traductor que lee los mismos mensajes del sitio.
poner("next-intl/server", {
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const mensajes = mensajesDe(locale);
    return (clave: string) => {
      const valor = mensajes[namespace]?.[clave];
      if (valor === undefined) throw new Error(`Falta el mensaje ${namespace}.${clave}`);
      return valor;
    };
  },
  setRequestLocale: () => {},
});

// El enrutado de Next tampoco está montado: el toggle sólo lo usa al pulsar.
poner("@/i18n/navigation", {
  useRouter: () => ({ replace: () => {} }),
  usePathname: () => "/",
});

const LEGALES = [
  { modulo: "@/app/[locale]/privacidad/page.tsx", ruta: "/privacidad", espacio: "PrivacyPolicy" },
  { modulo: "@/app/[locale]/codigo-conducta/page.tsx", ruta: "/codigo-conducta", espacio: "CodeOfConduct" },
];

describe("el canonical de las páginas legales", () => {
  for (const legal of LEGALES) {
    test(`${legal.ruta} apunta a sí misma`, async () => {
      const pagina = cargar(legal.modulo) as {
        generateMetadata: (props: { params: Promise<{ locale: string }> }) => Promise<{
          title?: string;
          alternates?: { canonical?: string | URL | null; languages?: Record<string, string> };
        }>;
      };

      for (const idioma of ["es", "en"]) {
        const meta = await pagina.generateMetadata({ params: Promise.resolve({ locale: idioma }) });
        const canonical = String(meta.alternates?.canonical ?? "");

        assert.equal(canonical, `${SITIO}${localePath(idioma, legal.ruta)}`);
        assert.notEqual(canonical, SITIO, "no puede heredar el canonical de la portada");
        assert.ok(canonical.endsWith(localePath(idioma, legal.ruta)), canonical);
        assert.equal(
          meta.alternates?.languages?.[idioma],
          `${SITIO}${localePath(idioma, legal.ruta)}`,
          "la traducción debe apuntar a la misma página",
        );
      }
    });

    test(`${legal.ruta} conserva su título`, async () => {
      const pagina = cargar(legal.modulo) as {
        generateMetadata: (props: { params: Promise<{ locale: string }> }) => Promise<{ title?: string }>;
      };

      for (const idioma of ["es", "en"]) {
        const meta = await pagina.generateMetadata({ params: Promise.resolve({ locale: idioma }) });
        assert.equal(meta.title, mensajesDe(idioma)[legal.espacio]?.title);
      }
    });
  }
});

describe("el selector de idioma", () => {
  const { LanguageToggle } = cargar("@/components/layout/language-toggle.tsx") as {
    LanguageToggle: () => React.ReactElement;
  };

  // El proveedor pide `children` en su tipo; aquí se lo pasan como argumento.
  const Proveedor = NextIntlClientProvider as unknown as React.ComponentType<{
    locale: string;
    children?: React.ReactNode;
  }>;

  const html = renderToStaticMarkup(
    createElement(Proveedor, { locale: "es" }, createElement(LanguageToggle)),
  );

  /**
   * El nombre accesible tiene que empezar por el texto que se ve. Después del
   * texto visible sólo puede venir un separador: si sigue una letra, el nombre
   * es otra cosa («Español» no es el «es» de la bandera).
   */
  function empiezaPorVisible(etiqueta: string, visible: string): boolean {
    if (!visible) return false;
    if (!etiqueta.toLowerCase().startsWith(visible.toLowerCase())) return false;
    const resto = etiqueta.slice(visible.length);
    return resto === "" || !/\p{L}/u.test(resto[0]);
  }

  test("cada botón tiene nombre accesible", () => {
    const botones = [...html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)];
    // Con un solo idioma el selector no se muestra.
    const esperados = IDIOMAS.length < 2 ? 0 : IDIOMAS.length;
    assert.equal(botones.length, esperados, "un botón por idioma");
    for (const [, atributos] of botones) {
      assert.match(atributos, /aria-label="[^"]+"/);
    }
  });

  test("el nombre accesible empieza por el texto que se ve", () => {
    for (const [, atributos, texto] of html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)) {
      const etiqueta = /aria-label="([^"]*)"/.exec(atributos)?.[1] ?? "";
      const visible = texto.trim();
      assert.ok(visible, "el botón tiene que mostrar su texto");
      assert.ok(
        empiezaPorVisible(etiqueta, visible),
        `«${etiqueta}» no empieza por «${visible}»`,
      );
    }
  });

  test("el análisis distingue el nombre viejo del nuevo", () => {
    // Sin esto, la comprobación de arriba pasaría igual con el «Español» de
    // antes, que es justo lo que había que arreglar.
    assert.equal(empiezaPorVisible("ES, Español", "ES"), true);
    assert.equal(empiezaPorVisible("Español", "es"), false);
    assert.equal(empiezaPorVisible("English", "en"), false);
    assert.equal(empiezaPorVisible("ES", "ES"), true);
  });
});

describe("las listas ordenadas", () => {
  const archivos = [
    "src/app/[locale]/speakers/_screen.tsx",
    "src/components/sections/call-for-speakers.tsx",
  ];

  /** El primer elemento que se abre dentro del `<ol>`: si no es un `li`, la lista está mal. */
  function primerHijo(bloque: string): string {
    const etiqueta = /<([a-zA-Z][\w-]*)/.exec(bloque);
    return etiqueta?.[1] ?? "";
  }

  function bloquesDe(fuente: string): string[] {
    const bloques: string[] = [];
    const patron = /<ol\b[^>]*>/g;
    for (const apertura of fuente.matchAll(patron)) {
      const cierre = fuente.indexOf("</ol>", apertura.index);
      assert.notEqual(cierre, -1, "cada `<ol>` se cierra");
      bloques.push(fuente.slice(apertura.index + apertura[0].length, cierre));
    }
    return bloques;
  }

  for (const archivo of archivos) {
    test(`${archivo}: el <ol> tiene <li> como hijo directo`, () => {
      const fuente = readFileSync(path.join(RAIZ, archivo), "utf8");
      const bloques = bloquesDe(fuente);
      assert.ok(bloques.length > 0, "el archivo tiene alguna lista ordenada");
      for (const bloque of bloques) {
        assert.equal(primerHijo(bloque), "li", `en ${archivo}: el hijo directo del <ol> no es un <li>`);
      }
    });
  }

  test("el análisis ve los dos casos", () => {
    // Sin esto, la comprobación de arriba pasaría igual si el análisis se
    // rompiera y dejaría de proteger nada.
    assert.equal(primerHijo(bloquesDe("<ol><li>uno</li></ol>")[0]), "li");
    assert.equal(primerHijo(bloquesDe("<ol><div><li>uno</li></div></ol>")[0]), "div");
  });
});
