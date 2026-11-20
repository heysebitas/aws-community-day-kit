import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SECCIONES, alcanza, nivelDe, permisosCompletos, permisosVacios,
  puedeEliminar, sanearPermisos, seccionDeRuta,
} from "@/lib/permisos";

/** Los permisos de sección del panel. */

const admin = { role: "admin", permisos: [] };
const organizadorViejo = { role: "organizer", permisos: [] };
const organizador = (p: Parameters<typeof sanearPermisos>[0]) => ({
  role: "organizer",
  permisos: sanearPermisos(p),
});

describe("nivel de acceso", () => {
  test("admin entra a todo", () => {
    for (const s of SECCIONES) assert.equal(nivelDe(admin, s.id), "editar");
  });

  test("un organizador sin lista guardada conserva todo", () => {
    // Las cuentas creadas antes de que existieran los permisos no tienen lista.
    // Cortarles el acceso de golpe sería peor que el problema que resuelven.
    assert.equal(nivelDe(organizadorViejo, "programa"), "editar");
  });

  test("lo que no está en la lista queda fuera", () => {
    const u = organizador([{ seccion: "programa", nivel: "editar" }]);
    assert.equal(nivelDe(u, "programa"), "editar");
    assert.equal(nivelDe(u, "registrations"), "no");
  });

  test("«editar» incluye «ver», pero no al revés", () => {
    const u = organizador([
      { seccion: "programa", nivel: "editar" },
      { seccion: "speakers", nivel: "ver" },
    ]);
    assert.equal(alcanza(u, "programa", "ver"), true);
    assert.equal(alcanza(u, "speakers", "editar"), false);
    assert.equal(alcanza(u, "speakers", "ver"), true);
  });

  test("sin usuario no se entra a nada", () => {
    assert.equal(nivelDe(null, "programa"), "no");
    assert.equal(alcanza(undefined, "programa", "ver"), false);
  });
});

describe("borrar", () => {
  test("es una casilla aparte: editar no basta", () => {
    // Éste es justo el caso del chico del programa: tenía «editar» y el botón
    // de borrar le respondía «Forbidden».
    const u = organizador([{ seccion: "programa", nivel: "editar" }]);
    assert.equal(alcanza(u, "programa", "editar"), true);
    assert.equal(puedeEliminar(u, "programa"), false);
  });

  test("con la casilla puesta, sí borra", () => {
    const u = organizador([{ seccion: "programa", nivel: "editar", eliminar: true }]);
    assert.equal(puedeEliminar(u, "programa"), true);
  });

  test("marcar borrar sobre «sólo ver» no significa nada", () => {
    const u = organizador([{ seccion: "programa", nivel: "ver", eliminar: true }]);
    assert.equal(puedeEliminar(u, "programa"), false);
  });

  test("admin y las cuentas sin lista borran", () => {
    assert.equal(puedeEliminar(admin, "programa"), true);
    assert.equal(puedeEliminar(organizadorViejo, "programa"), true);
  });
});

describe("saneado de lo que llega del formulario", () => {
  test("siempre devuelve todas las secciones del catálogo", () => {
    assert.equal(sanearPermisos([]).length, SECCIONES.length);
    assert.equal(sanearPermisos(null).length, SECCIONES.length);
    assert.equal(sanearPermisos("cualquier cosa").length, SECCIONES.length);
  });

  test("descarta secciones y niveles inventados", () => {
    const r = sanearPermisos([
      { seccion: "inventada", nivel: "editar" },
      { seccion: "faq", nivel: "superusuario" },
    ]);
    assert.equal(r.length, SECCIONES.length);
    assert.equal(r.find((p) => p.seccion === "faq")?.nivel, "no");
  });

  test("«quitar todo» deja una entrada en «no» por sección, no una lista vacía", () => {
    // Importa: una lista vacía significa «todo», así que vaciarla de verdad
    // daría acceso total a quien se le quiso quitar.
    const vacios = permisosVacios();
    assert.equal(vacios.length, SECCIONES.length);
    assert.equal(nivelDe({ role: "organizer", permisos: vacios }, "programa"), "no");
  });

  test("«marcar todo» da editar sin borrar", () => {
    const todo = permisosCompletos();
    assert.ok(todo.every((p) => p.nivel === "editar"));
    assert.ok(todo.every((p) => p.eliminar === false));
  });
});

describe("a qué sección pertenece cada ruta", () => {
  test("gana la coincidencia más larga", () => {
    // Sin esto, /admin/escaner/check-in se resolvía como /admin/check-in.
    assert.equal(seccionDeRuta("/admin/escaner/check-in"), "escaner_checkin");
    assert.equal(seccionDeRuta("/admin/check-in"), "checkin");
  });

  test("las dos secciones de correos caen bajo el mismo permiso", () => {
    // Escribir un correo y mandarlo viven en páginas distintas, cada una con
    // su dirección, pero el permiso que las gobierna es uno solo.
    assert.equal(seccionDeRuta("/admin/correos"), "correos");
    assert.equal(seccionDeRuta("/admin/correos/plantillas"), "correos");
    assert.equal(seccionDeRuta("/admin/correos/campanas"), "correos");
  });

  test("las subrutas heredan de su sección", () => {
    assert.equal(seccionDeRuta("/admin/speakers/ajustes"), "speakers");
    assert.equal(seccionDeRuta("/admin/programa"), "programa");
  });

  test("el tablero y los números no tienen sección: los ve cualquiera", () => {
    assert.equal(seccionDeRuta("/admin"), null);
    assert.equal(seccionDeRuta("/admin/evento"), null);
  });
});

describe("los roles de cada pantalla del panel", () => {
  test("una subpágina hereda los roles de su entrada del menú", async () => {
    const { rolesDeRuta } = await import("@/components/admin/nav-config");
    assert.deepEqual(rolesDeRuta("/admin/speakers/ajustes"), ["admin", "organizer"]);
    assert.ok(!rolesDeRuta("/admin/logs")?.includes("organizer"));
    assert.ok(!rolesDeRuta("/admin/correos/plantillas")?.includes("volunteer"));
    assert.ok(rolesDeRuta("/admin/check-in")?.includes("volunteer"));
    // La más larga gana: el escáner de check-in no es la pantalla de check-in.
    assert.ok(rolesDeRuta("/admin/escaner/badges")?.includes("badges"));
    assert.equal(rolesDeRuta("/admin"), null);
  });
});
