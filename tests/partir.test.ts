import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import es from "@/messages/es.json";

/**
 * Las pantallas partidas no cambian su HTML: cada una se compara con lo que
 * producía antes de partirla. `GENERAR_FIXTURES=1` los vuelve a escribir.
 */
const DIR = path.resolve(__dirname, "fixtures/partir");
const crear = createElement as unknown as (tipo: unknown, props: object | null, ...hijos: unknown[]) => React.ReactElement;

/** Los ids de useId cambian con el árbol; se igualan para comparar. */
function normalizar(html: string): string {
  const ids = new Map<string, string>();
  return html.replace(/(?:_r_[0-9a-z]+_|:r[0-9a-z]+:|«r[0-9a-z]+»)/g, (m) => {
    if (!ids.has(m)) ids.set(m, `ID${ids.size}`);
    return ids.get(m)!;
  });
}

function html(nodo: React.ReactElement, locale: "es" | "en" = "es"): string {
  return normalizar(renderToStaticMarkup(crear(NextIntlClientProvider, { locale, messages: es }, nodo)));
}

function comparar(nombre: string, actual: string) {
  const f = path.join(DIR, `${nombre}.html`);
  if (process.env.GENERAR_FIXTURES === "1") {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(f, actual);
    return;
  }
  assert.ok(existsSync(f), `falta el fixture ${nombre}`);
  assert.equal(actual, readFileSync(f, "utf8"), `el HTML de ${nombre} cambió`);
}

// Con el CFP cerrado la pantalla es otra: estos fixtures solo valen mientras siga abierto.
const cfpAbierto = async () => Date.now() <= new Date((await import("@/config")).EVENTO.cfpCierre).getTime();

describe("speakers", () => {
  for (const paso of [0, 1, 2]) {
    test(`paso ${paso} del formulario`, async (t) => {
      if (!(await cfpAbierto())) return t.skip("el CFP de la edición ya cerró");
      const { SpeakersScreen } = await import("@/app/[locale]/speakers/_screen");
      const { textosPostulacion } = await import("@/app/[locale]/speakers/_textos");
      comparar(`speakers-paso-${paso}`, html(crear(SpeakersScreen, { formOnly: true, pasoInicial: paso, textos: await textosPostulacion() })));
    });
  }
});

describe("voluntarios", () => {
  test("formulario", async () => {
    const { VoluntariosForm } = await import("@/app/[locale]/voluntarios/_form");
    const sbgs = [{ value: "uno", label: "Grupo uno" }, { value: "dos", label: "Grupo dos" }];
    comparar("voluntarios-form", html(crear(VoluntariosForm, { sbgs, onSubmit: async () => {} })));
  });
});

describe("pasaporte", () => {
  const passport = {
    shortId: "abc123", role: "speaker", firstName: "Ana", lastName: "Prueba",
    company: "Ejemplo SA", jobTitle: "Ingeniera",
    social: { linkedin: "ana-prueba", github: "ana-prueba" },
    stats: { views: 12, clicks: { linkedin: 3 } },
    stamps: [{ sponsorId: "s1", sponsorName: "Patrocinador Uno", stampedAt: "2026-01-01T10:00:00.000Z" }],
  };
  const sponsors = [{ _id: "s1", sponsorName: "Patrocinador Uno" }, { _id: "s2", sponsorName: "Patrocinador Dos" }];
  const casos: Record<string, object> = {
    visitante: { passport, sponsors, loading: false },
    "visitante-pin": { passport, sponsors, loading: false, pin: true },
    propietario: { passport: { ...passport, role: "volunteer" }, sponsors, loading: false, isOwner: true },
    "propietario-redes": { passport, sponsors, loading: false, isOwner: true, editing: true },
    "propietario-sello": { passport, sponsors, loading: false, isOwner: true, stampModal: true },
    cargando: {},
    "no-encontrado": { loading: false, notFound: true },
  };
  for (const [nombre, ini] of Object.entries(casos)) {
    test(nombre, async () => {
      const { PasaporteVista } = await import("@/app/[locale]/pasaporte/[shortId]/_vista");
      comparar(`pasaporte-${nombre}`, html(crear(PasaporteVista, { shortId: "abc123", inicial: ini })));
    });
  }
});

describe("canvas del admin", () => {
  const base = {
    slug: "ana-prueba", name: "Ana Prueba", status: "approved", track: "general", photo: "",
    talkTitle: "Una charla de prueba", talkTitleCard: "", tagline: "Ingeniera", role: "Ingeniera",
    company: "Ejemplo SA", roleCard: "", coSpeakers: [],
    cardContentX: null, cardContentY: null, cardNameOffset: null, cardTitleSize: null, cardNameSize: null,
    cardPhotoX: null, cardPhotoY: null, cardPhotoZoom: null, cardApproved: false, cardImageUrl: "",
  };
  const perfiles = [base, { ...base, slug: "luis-ejemplo", name: "Luis Ejemplo", track: "serverless", cardApproved: true }];
  const casos: Record<string, { perfiles?: object[]; cargando?: boolean; cats?: boolean; guias?: boolean }> = {
    editor: { perfiles, cargando: false },
    "editor-categorias": { perfiles, cargando: false, cats: true, guias: true },
    vacio: { perfiles: [], cargando: false },
    cargando: {},
  };
  for (const [nombre, ini] of Object.entries(casos)) {
    test(nombre, async () => {
      const { CanvasEditor } = await import("@/app/[locale]/admin/speakers/canvas/_editor");
      const { SearchParamsContext } = await import("next/dist/shared/lib/hooks-client-context.shared-runtime");
      const inicial = { perfiles: ini.perfiles, cargando: ini.cargando, categorias: ini.cats, guias: ini.guias };
      comparar(`canvas-${nombre}`, html(crear(SearchParamsContext.Provider, { value: new URLSearchParams() }, crear(CanvasEditor, { inicial }))));
    });
  }
});
