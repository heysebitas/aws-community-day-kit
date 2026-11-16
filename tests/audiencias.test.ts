import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLICOS, consultaDe, publicoDe, resumenAudiencia, resumenSegmento,
  sanearAudiencia, sanearSegmento, type Segmento,
} from "@/lib/audiencias";

/** Las audiencias. */

const seg = (publico: string, filtros: Record<string, string[]> = {}) =>
  ({ publico, filtros }) as Segmento;

describe("el catálogo", () => {
  test("los cuatro públicos existen y tienen filtros", () => {
    assert.deepEqual(PUBLICOS.map((p) => p.clave), ["asistentes", "speakers", "voluntarios", "equipo"]);
    for (const p of PUBLICOS) assert.ok(p.filtros.length > 0, `${p.clave} sin filtros`);
  });

  test("ningún público repite la clave de un filtro", () => {
    for (const p of PUBLICOS) {
      const claves = p.filtros.map((f) => f.clave);
      assert.equal(new Set(claves).size, claves.length, `${p.clave} repite una clave`);
    }
  });

  test("ninguna opción tiene el valor vacío ni se repite", () => {
    for (const p of PUBLICOS) {
      for (const f of p.filtros) {
        const vals = f.opciones.map((o) => o.valor);
        assert.ok(vals.every((v) => v.length > 0), `${p.clave}.${f.clave} con valor vacío`);
        assert.equal(new Set(vals).size, vals.length, `${p.clave}.${f.clave} repite un valor`);
        assert.ok(f.opciones.every((o) => o.etiqueta.trim()), `${p.clave}.${f.clave} sin etiqueta`);
      }
    }
  });

  test("un público inventado no existe", () => {
    assert.equal(publicoDe("patrocinadores"), null);
  });
});

describe("la consulta que sale de los filtros", () => {
  test("sin filtros es todo el público, no «nadie»", () => {
    assert.deepEqual(consultaDe(seg("asistentes")), {});
  });

  /**
   * La audiencia se guarda como Mixed, y una copia guardada con `filtros: {}`
   * puede volver de la base sin la clave.
   */
  test("un segmento sin la clave de filtros es todo el público", () => {
    const sinFiltros = { publico: "voluntarios" } as unknown as Segmento;
    assert.deepEqual(consultaDe(sinFiltros), {});
    assert.equal(resumenSegmento(sinFiltros), "Voluntarios (todos)");
  });

  test("un filtro de lista pide estar en ella", () => {
    assert.deepEqual(
      consultaDe(seg("asistentes", { modalidad: ["in-person"] })),
      { attendance: { $in: ["in-person"] } },
    );
  });

  test("varios valores del mismo filtro son «o»", () => {
    assert.deepEqual(
      consultaDe(seg("speakers", { estado: ["accepted", "waitlisted"] })),
      { status: { $in: ["accepted", "waitlisted"] } },
    );
  });

  test("filtros distintos son «y»", () => {
    assert.deepEqual(
      consultaDe(seg("speakers", { estado: ["accepted"], procedencia: ["international"] })),
      { status: { $in: ["accepted"] }, speakerType: { $in: ["international"] } },
    );
  });

  test("el booleano en «sí» exige true", () => {
    assert.deepEqual(
      consultaDe(seg("asistentes", { confirmado: ["si"] })),
      { "confirmation.confirmed": true },
    );
  });

  test("el booleano en «no» usa $ne, para no perder a los registros viejos sin el campo", () => {
    // `{campo: false}` dejaría fuera a quien se registró antes de que el campo
    // existiera, que es justo a quien hay que recordarle que confirme.
    assert.deepEqual(
      consultaDe(seg("asistentes", { confirmado: ["no"] })),
      { "confirmation.confirmed": { $ne: true } },
    );
  });

  test("marcar sí y no es lo mismo que no filtrar", () => {
    assert.deepEqual(consultaDe(seg("asistentes", { confirmado: ["si", "no"] })), {});
  });

  test("la modalidad de la charla cubre las dos palabras que hay en la base", () => {
    // Los datos antiguos dicen `virtual`; los nuevos, `online`.
    const q = consultaDe(seg("speakers", { modalidad: ["online"] })) as { sessionType: { $in: string[] } };
    assert.deepEqual(q.sessionType.$in.sort(), ["online", "virtual"]);

    const p = consultaDe(seg("speakers", { modalidad: ["presencial"] })) as { sessionType: { $in: string[] } };
    assert.deepEqual(p.sessionType.$in.sort(), ["in-person", "presencial"]);
  });

  test("las áreas de interés son un campo de lista: basta una coincidencia", () => {
    assert.deepEqual(
      consultaDe(seg("voluntarios", { areas: ["tech", "rooms"] })),
      { interestAreas: { $in: ["tech", "rooms"] } },
    );
  });

  test("un público inventado no genera consulta", () => {
    assert.deepEqual(consultaDe(seg("fantasmas", { x: ["y"] })), {});
  });
});

describe("saneado", () => {
  test("descarta el público que no existe", () => {
    assert.equal(sanearSegmento({ publico: "fantasmas", filtros: {} }), null);
    assert.equal(sanearSegmento(null), null);
    assert.equal(sanearSegmento("asistentes"), null);
  });

  test("descarta filtros que el público no tiene", () => {
    const s = sanearSegmento({ publico: "equipo", filtros: { track: ["cloud"] } })!;
    assert.deepEqual(s.filtros, {});
  });

  test("descarta valores inventados en vez de dejarlos llegar a la consulta", () => {
    // Un valor inventado en un $in no da error: da cero destinatarios, y eso
    // se lee como «no hay nadie» en lugar de como un fallo.
    const s = sanearSegmento({ publico: "speakers", filtros: { estado: ["accepted", "inventado"] } })!;
    assert.deepEqual(s.filtros.estado, ["accepted"]);
  });

  test("un filtro que se queda sin valores desaparece", () => {
    const s = sanearSegmento({ publico: "speakers", filtros: { estado: ["xxx"] } })!;
    assert.equal("estado" in s.filtros, false);
    assert.deepEqual(consultaDe(s), {}, "y la consulta es todo el público");
  });

  test("quita valores repetidos", () => {
    const s = sanearSegmento({ publico: "speakers", filtros: { estado: ["accepted", "accepted"] } })!;
    assert.deepEqual(s.filtros.estado, ["accepted"]);
  });

  test("ignora lo que no es array", () => {
    const s = sanearSegmento({ publico: "speakers", filtros: { estado: "accepted" } })!;
    assert.deepEqual(s.filtros, {});
  });

  test("una audiencia descarta los segmentos malos y conserva los buenos", () => {
    const a = sanearAudiencia([
      { publico: "speakers", filtros: { estado: ["accepted"] } },
      { publico: "fantasmas", filtros: {} },
      { publico: "voluntarios", filtros: {} },
    ]);
    assert.deepEqual(a.map((s) => s.publico), ["speakers", "voluntarios"]);
  });

  test("lo que no es una lista da audiencia vacía", () => {
    assert.deepEqual(sanearAudiencia({ publico: "speakers" }), []);
    assert.deepEqual(sanearAudiencia(undefined), []);
  });

  test("hay tope de segmentos", () => {
    const muchos = Array.from({ length: 50 }, () => ({ publico: "voluntarios", filtros: {} }));
    assert.equal(sanearAudiencia(muchos).length, 20);
  });
});

describe("cómo se lee un segmento", () => {
  test("sin filtros dice que son todos", () => {
    assert.equal(resumenSegmento(seg("voluntarios")), "Voluntarios (todos)");
  });

  test("con filtros los nombra con sus etiquetas, no con sus códigos", () => {
    const r = resumenSegmento(seg("speakers", { estado: ["accepted", "waitlisted"] }));
    assert.equal(r, "Speakers — estado de la postulación: Aceptada o En lista de espera");
  });

  test("varios segmentos se suman", () => {
    const r = resumenAudiencia([
      seg("speakers", { estado: ["accepted"] }),
      seg("voluntarios", { aprobado: ["si"] }),
    ]);
    assert.equal(r, "Speakers — estado de la postulación: Aceptada  +  Voluntarios — aprobado: Sí");
  });

  test("una audiencia vacía se dice, no se calla", () => {
    assert.equal(resumenAudiencia([]), "sin audiencia");
  });
});
