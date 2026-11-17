import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * El texto que se ve en pantalla no se escribe a mano: va en `src/messages`.
 * Esta prueba revisa las pantallas donde más se ha colado texto en español:
 * el login, la creación de contraseña y el pasaporte.
 */

const RAIZ = path.resolve(import.meta.dirname, "..");

/** Las pantallas que revisa la prueba. */
const RUTAS = [
  "src/app/[locale]/admin/login",
  "src/app/[locale]/admin/create-password",
  "src/app/[locale]/pasaporte",
];

function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? ficheros(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

const leer = (relativo: string) => readFileSync(path.join(RAIZ, relativo), "utf8");

/** Los comentarios no se ven: se quitan antes de mirar el texto. */
function sinComentarios(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

/**
 * El PIN (y la foto) los trae otro trabajo: sus etiquetas siguen en español y
 * aquí se listan para que la prueba no las marque.
 */
const PENDIENTES = new Set([
  "Intenta otro PIN",
  "Ingresa el PIN del sponsor para reclamar tu sello",
  "Se envía automáticamente al completar los 4 dígitos",
]);

/** Palabras que sólo se escriben en español. */
const PALABRAS_ES =
  /\b(el|la|los|las|un|una|uno|unos|unas|del|de|para|por|con|sin|tu|tus|su|sus|mis|que|cuando|donde|ya|ser|tiene|tienen|hacer|puedes|debe|solo|sólo|más|pero|este|esta|esto|eso|otro|otra|nada|todo|toda|todos|todas|hola|gracias|favor|contraseña|correo|usuario|usuarios|pasaporte|sello|sellos|redes|conectar|editar|ver|guardar|agregar|cambiar|quitar|cargando|verifica|ingresa|buscar|selecciona|escribe|elige|crear|acceso|entrar|configura|configurar|sección|día|días|evento|sede|ciudad|país|entrada|mensaje|ayuda|aceptar|cancelar|continuar|siguiente|anterior|volver|salir|registrar|postular|postulación|comunidad|comunidades|patrocinador|patrocinadores|invitación|invite|código|obligatorio|opcional|requerido|aquí|allí|hoy|mañana)\b/i;

const ACENTOS = /[áéíóúüñÁÉÍÓÚÑ¿¡]/;

/** ¿Esto es texto en español? */
function esEspanol(texto: string): boolean {
  return ACENTOS.test(texto) || PALABRAS_ES.test(texto);
}

/** El texto que se ve: los nodos de JSX y los atributos literales. */
function* visibles(codigo: string): Generator<{ donde: string; texto: string }> {
  for (const m of codigo.matchAll(/>([^<>{}]+)(?=[<{])/g)) {
    const texto = m[1].trim();
    // Un trozo con paréntesis o signos es código, no texto.
    if (texto && /[a-zá-ú]/i.test(texto) && !/[();=|&]/.test(texto) && texto.length <= 160) {
      yield { donde: "texto JSX", texto };
    }
  }
  for (const m of codigo.matchAll(/\b(placeholder|aria-label|title|label|alt)="([^"]*)"/g)) {
    const texto = m[2].trim();
    if (texto) yield { donde: m[1], texto };
  }
}

describe("el texto visible de login, crear contraseña y el pasaporte", () => {
  for (const ruta of RUTAS) {
    for (const fichero of ficheros(path.join(RAIZ, ruta))) {
      test(`${path.relative(RAIZ, fichero)}: no tiene texto en español escrito a mano`, () => {
        const codigo = sinComentarios(leer(path.relative(RAIZ, fichero)));
        const encontrados = [...visibles(codigo)]
          .filter((v) => esEspanol(v.texto))
          .filter((v) => !PENDIENTES.has(v.texto))
          .map((v) => `${v.donde}: «${v.texto}»`);
        assert.deepEqual(encontrados, []);
      });
    }
  }
});

describe("los formularios de acceso", () => {
  test("el login autocompleta el usuario y la contraseña actual", () => {
    const src = leer("src/app/[locale]/admin/login/login-form.tsx");
    assert.match(src, /autoComplete="username"/);
    assert.match(src, /autoComplete="current-password"/);
  });

  test("crear contraseña pide una contraseña nueva de diez caracteres, como la API", () => {
    const src = leer("src/app/[locale]/admin/create-password/page.tsx");
    assert.match(src, /autoComplete="new-password"/);
    assert.match(src, /minLength=\{10\}/);
  });

  test("crear contraseña dice con qué cuenta es la contraseña nueva", () => {
    const src = leer("src/app/[locale]/admin/create-password/page.tsx");
    assert.match(src, /<input type="email" name="username" autoComplete="username" hidden readOnly/);
  });

  test("el error general de los formularios se anuncia", () => {
    const formularios = [
      "src/app/[locale]/admin/login/login-form.tsx",
      "src/app/[locale]/admin/create-password/page.tsx",
      "src/app/[locale]/registro/_form.tsx",
      "src/app/[locale]/voluntarios/_form.tsx",
    ];
    for (const f of formularios) {
      const src = leer(f);
      assert.match(src, /role="alert"/, `${f}: el error general no se anuncia`);
    }
  });
});
