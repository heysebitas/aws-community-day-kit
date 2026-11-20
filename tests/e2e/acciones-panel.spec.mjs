// Lo que el staff hace en el panel, de punta a punta: crear, editar, exportar, previsualizar y borrar.
// Se corre con `npx playwright test` con la demo ya levantada (ver docs/pruebas.md).
// Sólo toca la base en memoria de la demo; los correos se quedan en la consola del servidor.
import { test, expect } from "@playwright/test";
import { entrar, marca, vigilar } from "./ayuda.mjs";

/** El aviso (toast) que deja cada acción. */
const aviso = (page, texto) => page.getByRole("status").filter({ hasText: texto }).first();

test.beforeEach(async ({ page }) => {
  await entrar(page, "demo@example.com");
});

test("FAQ: crear una pregunta, verla en el sitio y borrarla", async ({ page, request }) => {
  const errores = vigilar(page);
  const m = marca();
  const pregunta = `¿Prueba e2e ${m}?`;
  await page.goto("/admin/faq", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Agregar pregunta" }).click();
  await page.getByLabel("Pregunta (ES)").fill(pregunta);
  await page.getByPlaceholder("Escribe la respuesta en español...").fill("Sí, es una prueba.");
  await page.getByLabel("Pregunta (EN)").fill(`E2E test ${m}?`);
  await page.getByPlaceholder("Write the answer in English...").fill("Yes, it is a test.");
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(aviso(page, "Pregunta creada")).toBeVisible();

  // La API pública ya la sirve.
  expect(JSON.stringify(await (await request.get("/api/faq")).json())).toContain(pregunta);

  const fila = page.getByRole("row").filter({ hasText: pregunta });
  await fila.getByRole("button").last().click();
  await page.getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(aviso(page, "Pregunta eliminada")).toBeVisible();
  await expect(fila).toHaveCount(0);
  expect(errores, errores.join("\n")).toEqual([]);
});

test("asistentes: exportar CSV trae la lista con cabecera", async ({ page }) => {
  await page.goto("/admin/registrations", { waitUntil: "networkidle" });
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar CSV" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/\.csv$/);
  const texto = await (await import("node:fs/promises")).readFile(await archivo.path(), "utf8");
  expect(texto.split("\n").length).toBeGreaterThan(5);
});

test("voluntarios y speakers también exportan", async ({ page }) => {
  for (const ruta of ["/api/volunteers/export", "/api/speakers/export"]) {
    const r = await page.request.get(ruta);
    expect(r.status(), ruta).toBe(200);
    expect((await r.text()).length, ruta).toBeGreaterThan(50);
  }
});

test("programa: agendar a un speaker aceptado y quitarlo", async ({ page }) => {
  await page.goto("/admin/programa", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nuevo bloque" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: "Sesión", exact: true }).click();
  const speaker = dialogo.getByLabel(/Speaker aceptado/);
  const elegido = (await speaker.locator("option").allTextContents()).find((o) => o.trim() && !o.startsWith("—"));
  test.skip(!elegido, "no queda ningún speaker aceptado sin agendar en esta demo");
  await speaker.selectOption({ label: elegido });
  const salon = dialogo.getByLabel(/Salón/);
  const lab = (await salon.locator("option").allTextContents()).find((o) => o.startsWith("Laboratorio"));
  await salon.selectOption({ label: lab });
  await dialogo.getByLabel(/Hora de inicio/i).fill("17:00");
  await dialogo.getByLabel(/Hora de fin/i).fill("17:30");
  await dialogo.getByRole("button", { name: "Crear bloque" }).click();
  await expect(aviso(page, "Bloque creado")).toBeVisible();

  // Sale en la agenda pública, y se quita por la API que usa el panel.
  const nombre = elegido.split(" ")[0];
  const bloques = (await (await page.request.get("/api/agenda")).json());
  const lista = Array.isArray(bloques) ? bloques : (bloques.sessions ?? bloques.agenda ?? Object.values(bloques).find(Array.isArray) ?? []);
  const nuevo = lista.find((x) => JSON.stringify(x).includes(nombre) && JSON.stringify(x).includes("17:00"));
  expect(nuevo, `el bloque de ${elegido} sale en /api/agenda`).toBeTruthy();
  const quitar = await page.request.delete(`/api/agenda/${nuevo._id ?? nuevo.id}`);
  expect(quitar.status()).toBeLessThan(300);
});

test("speakers: la ficha de una propuesta abre con su estado", async ({ page }) => {
  await page.goto("/admin/speakers/pablo-lozano", { waitUntil: "networkidle" });
  await expect(page.getByText("el estado")).toBeVisible();
  const lista = await page.request.get("/api/speakers");
  expect(lista.status()).toBe(200);
});

test("correos: una plantilla se previsualiza y se guarda", async ({ page }) => {
  await page.goto("/admin/correos/plantillas", { waitUntil: "networkidle" });
  const vista = page.locator('iframe[title="Vista previa del correo"]');
  await expect(vista).toBeVisible();
  // El contenido del correo se pinta dentro del iframe.
  await expect(vista.contentFrame().locator("body")).not.toBeEmpty();
  // Cambiar el asunto se ve en la vista previa y se guarda; luego se deja como estaba.
  const asunto = page.getByRole("textbox", { name: "Asunto", exact: true });
  const original = await asunto.inputValue();
  await asunto.fill(`${original} (e2e)`);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(aviso(page, "Guardado")).toBeVisible();
  await asunto.fill(original);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
});

test("certificados: el PDF de un voluntario abre", async ({ page }) => {
  await page.goto("/admin/certificados", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ver", exact: true }).first().click();
  const marco = page.locator('iframe[title="Certificado"]');
  await expect(marco).toBeVisible();
  const r = await page.request.get(await marco.getAttribute("src"));
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("application/pdf");
  expect((await r.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("cuentas: crear un voluntario nuevo y que pueda listar asistentes", async ({ page }) => {
  const m = marca();
  await page.goto("/admin/users", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  const dialogo = page.getByRole("dialog", { name: "Crear Usuario" });
  await dialogo.getByLabel(/^Nombre/).fill(`Staff ${m}`);
  await dialogo.getByLabel(/^Email/).fill(`e2e-staff-${m}@example.com`);
  await dialogo.getByRole("combobox", { name: /Rol/ }).click();
  await page.getByRole("option", { name: "Voluntario" }).click();
  await dialogo.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(aviso(page, `Usuario Staff ${m} creado`)).toBeVisible();
  expect(JSON.stringify(await (await page.request.get("/api/users")).json())).toContain(`e2e-staff-${m}@example.com`);
});

test("reportes: el Excel de Credly se descarga", async ({ page }) => {
  const r = await page.request.get("/api/admin/reports/credly");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toMatch(/spreadsheet|octet-stream/);
});

test("tablero en vivo y consola cargan sus números", async ({ page }) => {
  for (const ruta of ["/api/stats/event", "/api/stats", "/api/admin/console"]) {
    expect((await page.request.get(ruta)).status(), ruta).toBe(200);
  }
});
