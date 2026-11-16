import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vincularDialogo, type DialogoEl } from "@/hooks/use-dialogo";
import { dialogoAbierto, ToastProvider } from "@/components/ui/toast";
import { ScrollReveal } from "@/components/effects/scroll-reveal";

/** Foco, Escape y marcado de los diálogos, los avisos y el respaldo sin JS. */

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), "utf8");

/** Un `<dialog>` de mentira: lo justo para ver qué le pide el hook. */
function falso() {
  const oyentes = new Map<string, (e: Event) => void>();
  const el = {
    open: false,
    llamadas: [] as string[],
    showModal() { this.open = true; this.llamadas.push("showModal"); },
    close() { this.open = false; this.llamadas.push("close"); },
    addEventListener(t: string, f: (e: Event) => void) { oyentes.set(t, f); },
    removeEventListener(t: string) { oyentes.delete(t); },
  };
  return { el, oyentes };
}

describe("vincularDialogo", () => {
  test("abre como modal y Escape (cancel) cierra por el estado, no por el navegador", () => {
    const { el, oyentes } = falso();
    let cerrado = 0;
    vincularDialogo(el as unknown as DialogoEl, () => cerrado++, { activeElement: null });
    assert.deepEqual(el.llamadas, ["showModal"]);

    let prevenido = false;
    oyentes.get("cancel")!({ preventDefault: () => (prevenido = true) } as unknown as Event);
    assert.equal(prevenido, true);
    assert.equal(cerrado, 1);
  });

  test("al cerrar el foco vuelve al disparador", () => {
    const { el, oyentes } = falso();
    let enfocado = 0;
    const disparador = { isConnected: true, focus: () => enfocado++ };
    const soltar = vincularDialogo(el as unknown as DialogoEl, () => {}, {
      activeElement: disparador as unknown as Element,
    });
    soltar();
    assert.equal(el.open, false);
    assert.equal(enfocado, 1);
    assert.equal(oyentes.size, 0);
  });

  test("no enfoca un disparador que ya no está en la página", () => {
    const { el } = falso();
    let enfocado = 0;
    const disparador = { isConnected: false, focus: () => enfocado++ };
    vincularDialogo(el as unknown as DialogoEl, () => {}, { activeElement: disparador as unknown as Element })();
    assert.equal(enfocado, 0);
  });
});

describe("diálogos y menú móvil", () => {
  const modales = [
    "src/components/ui/modal.tsx",
    "src/components/admin/confirm.tsx",
    "src/components/admin/prompt.tsx",
    "src/components/ui/share-modal.tsx",
    "src/components/sections/agenda.tsx",
    "src/components/layout/mobile-nav.tsx",
  ];

  for (const f of modales) {
    test(`${f}: <dialog> con nombre y useDialogo`, () => {
      const src = leer(f);
      assert.match(src, /<dialog\b/);
      assert.match(src, /aria-label(ledby)?=/);
      assert.match(src, /useDialogo\(/);
    });

    test(`${f}: sin escuchar Escape por su cuenta`, () => {
      assert.doesNotMatch(leer(f), /["']Escape["']/);
    });
  }

  test("Modal, Confirm, Prompt y Share mantienen useScrollLock", () => {
    for (const f of modales.slice(0, 4)) assert.match(leer(f), /useScrollLock\(/);
    assert.match(leer("src/components/layout/mobile-nav.tsx"), /useScrollLock\(/);
  });

  test("el botón del menú anuncia si está abierto", () => {
    const src = leer("src/components/layout/navbar.tsx");
    assert.match(src, /aria-expanded=\{mobileOpen\}/);
    assert.match(src, /aria-controls="menu-movil"/);
  });

  test("hay una sola implementación de Escape en los componentes de la zona", () => {
    assert.match(leer("src/hooks/use-dialogo.ts"), /"cancel"/);
  });
});

describe("avisos", () => {
  test("la región viva está en el marcado y anuncia", () => {
    const html = renderToStaticMarkup(createElement(ToastProvider, null, "x"));
    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
  });

  test("el botón de cerrar tiene nombre y hay pausa con puntero y foco", () => {
    const src = leer("src/components/ui/toast.tsx");
    assert.match(src, /aria-label="Cerrar aviso"/);
    for (const ev of ["onMouseEnter", "onMouseLeave", "onFocus", "onBlur"]) assert.match(src, new RegExp(ev));
  });

  test("se montan en el diálogo abierto más reciente", () => {
    const a = { id: "a" }, b = { id: "b" };
    const doc = { querySelectorAll: () => [a, b] };
    assert.equal(dialogoAbierto(doc as unknown as Document), b);
    assert.equal(dialogoAbierto({ querySelectorAll: () => [] } as unknown as Document), null);
  });
});

describe("sin JavaScript", () => {
  const css = leer("src/app/globals.css");

  test("el layout pone la clase js con un script inline", () => {
    const src = leer("src/app/[locale]/layout.tsx");
    assert.match(src, /classList\.add\('js'\)/);
  });

  test("el estado oculto de ScrollReveal sólo se respeta bajo .js", () => {
    assert.doesNotMatch(css, /scripting:\s*none/);
    assert.match(css, /html:not\(\.js\)\s+\.scroll-reveal\s*\{[^}]*opacity:\s*1\s*!important/);
  });

  test("todo bloque que sale con opacity:0 es .scroll-reveal, que sin .js se muestra", () => {
    const html = renderToStaticMarkup(createElement(ScrollReveal, null, "hola"));
    assert.match(html, /style="opacity:0"/);
    for (const m of html.matchAll(/<[^>]*opacity:\s*0[^>]*>/g)) assert.match(m[0], /class="[^"]*\bscroll-reveal\b/);
  });
});

describe("saltar al contenido", () => {
  test("hay enlace al contenido y destino en el layout", () => {
    const src = leer("src/app/[locale]/layout.tsx");
    assert.match(src, /href="#contenido"/);
    assert.match(src, /id="contenido"/);
  });

  test("el pasaporte tiene <main>", () => {
    assert.match(leer("src/app/[locale]/pasaporte/[shortId]/page.tsx"), /<main\b[\s\S]*<\/main>/);
  });

  test("el texto del enlace existe en todos los idiomas", () => {
    for (const l of ["es", "en"]) {
      const m = JSON.parse(leer(`src/messages/${l}.json`));
      assert.ok(m.Nav.skip_to_content && m.Nav.menu);
    }
  });
});
