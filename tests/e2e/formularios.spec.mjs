// Los formularios públicos llenados como lo haría una persona, no por la API.
// Se corre con `npx playwright test` con la demo ya levantada (ver docs/pruebas.md).
import { test, expect } from "@playwright/test";
import { marca, vigilar } from "./ayuda.mjs";

/** Los desplegables con buscador (SearchSelect): abre por su etiqueta y elige la opción. */
async function elegir(page, etiqueta, opcion) {
  // Las etiquetas de lo obligatorio terminan en « *».
  const nombre = new RegExp(`^${etiqueta.replace(/[?¿()*+.[\]\\^$|{}]/g, "\\$&")}\\s*\\*?$`);
  await page.getByRole("button", { name: nombre }).click();
  await page.getByRole("option", { name: opcion }).first().click();
}

async function aceptarConsentimientos(page) {
  await page.getByRole("checkbox", { name: /Código de Conducta/ }).click();
  await page.getByRole("checkbox", { name: /Política de Privacidad/ }).click();
}

test.describe("registro de asistentes", () => {
  test("presencial con documento: llega a la página de gracias con el pasaporte", async ({ page }) => {
    const errores = vigilar(page);
    const m = marca();
    await page.goto("/registro", { waitUntil: "networkidle" });
    await page.locator("#f-name").fill("Ana");
    await page.locator("#f-last").fill(`Presencial ${m}`);
    await page.locator("#f-mail").fill(`e2e-presencial-${m}@example.com`);
    await page.getByRole("button", { name: "Presencial", exact: true }).click();
    await elegir(page, "Tipo de documento", "Cédula de ciudadanía");
    await page.locator("#f-docn").fill(String(Date.now()).slice(-10));
    await elegir(page, "¿A qué te dedicas?", "Estudiante universitario");
    await elegir(page, "¿Dónde estudias o trabajas?", "Universidad");
    await page.locator("#f-entn").fill("Universidad de Pruebas");
    await aceptarConsentimientos(page);
    await page.getByRole("button", { name: "Registrarme" }).click();

    await page.waitForURL(/\/registro\/gracias/);
    await expect(page.getByText("nos vemos ahí")).toBeVisible();
    await expect(page.getByText("así se verá tu pasaporte")).toBeVisible();
    expect(errores, errores.join("\n")).toEqual([]);
  });

  test("virtual: no pide documento", async ({ page }) => {
    const m = marca();
    await page.goto("/registro", { waitUntil: "networkidle" });
    await page.locator("#f-name").fill("Ana");
    await page.locator("#f-last").fill(`Virtual ${m}`);
    await page.locator("#f-mail").fill(`e2e-virtual-${m}@example.com`);
    await page.getByRole("button", { name: "Virtual", exact: true }).click();
    await expect(page.locator("#f-docn")).toHaveCount(0);
    await elegir(page, "¿A qué te dedicas?", "Estudiante universitario");
    await elegir(page, "¿Dónde estudias o trabajas?", "Ninguna / Independiente");
    await aceptarConsentimientos(page);
    await page.getByRole("button", { name: "Registrarme" }).click();
    await page.waitForURL(/\/registro\/gracias/);
    await expect(page.getByText("nos vemos en línea")).toBeVisible();
  });

  test("vacío no se envía y dice qué falta", async ({ page }) => {
    let enviado = false;
    page.on("request", (r) => { if (r.url().includes("/api/registrations") && r.method() === "POST") enviado = true; });
    await page.goto("/registro", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(page.getByText("Escribe tu nombre.")).toBeVisible();
    expect(enviado).toBe(false);
  });

  test("un correo repetido se rechaza", async ({ page, request }) => {
    const m = marca();
    const correo = `e2e-repetido-${m}@example.com`;
    const datos = { firstName: "Ana", lastName: "Repetida", email: correo, attendance: "online", role: "Prueba", entityType: "none", acceptCoc: true, acceptPrivacy: true };
    expect((await request.post("/api/registrations", { data: { data: datos, captchaToken: `demo-a-${m}` } })).status()).toBeLessThan(300);

    await page.goto("/registro", { waitUntil: "networkidle" });
    await page.locator("#f-name").fill("Ana");
    await page.locator("#f-last").fill("Repetida");
    await page.locator("#f-mail").fill(correo);
    await page.getByRole("button", { name: "Virtual", exact: true }).click();
    await elegir(page, "¿A qué te dedicas?", "Estudiante universitario");
    await elegir(page, "¿Dónde estudias o trabajas?", "Ninguna / Independiente");
    await aceptarConsentimientos(page);
    await page.getByRole("button", { name: "Registrarme" }).click();
    await expect(page.getByText("Este correo ya está registrado en el evento.")).toBeVisible();
    await expect(page).toHaveURL(/\/registro$/);
  });

  test("en inglés el formulario sale en inglés", async ({ page }) => {
    await page.goto("/en/registro", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Register" })).toBeVisible();
    await expect(page.getByRole("button", { name: "In person", exact: true })).toBeVisible();
  });
});

test.describe("voluntarios", () => {
  test("la postulación completa queda recibida", async ({ page }) => {
    const errores = vigilar(page);
    const m = marca();
    await page.goto("/voluntarios", { waitUntil: "networkidle" });
    await page.locator("#v-name").fill("Vale");
    await page.locator("#v-last").fill(`Voluntaria ${m}`);
    await page.locator("#v-mail").fill(`e2e-vol-${m}@example.com`);
    await page.getByLabel("Teléfono", { exact: true }).fill("3001234567");
    await elegir(page, "Tipo de documento", "Cédula de ciudadanía");
    await page.locator("#v-docn").fill(String(Date.now()).slice(-10));
    await elegir(page, "¿Cuál es tu rol?", "Estudiante universitario");
    await elegir(page, "¿De dónde vienes?", "Ninguna / Independiente");
    await elegir(page, "¿Haces parte de un AWS Student Builder Group?", "No pertenezco a ninguno");
    await page.getByRole("button", { name: "Todo el día" }).click();
    await page.getByRole("button", { name: "Donde más se necesite" }).click();
    await page.getByRole("button", { name: "Es mi primera vez" }).click();
    await page.getByRole("button", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "Sin restricciones" }).click();
    await page.locator("#v-emn").fill("Mamá");
    await page.getByLabel("Teléfono del contacto de emergencia").fill("3007654321");
    await aceptarConsentimientos(page);
    await page.getByRole("button", { name: "Postularme" }).click();

    await expect(page.getByText("postulación recibida", { exact: true })).toBeVisible();
    expect(errores, errores.join("\n")).toEqual([]);
  });
});

test.describe("postulación de speakers", () => {
  // El envío completo necesita la foto en el bucket, que la demo no tiene: se prueban los pasos.
  test("no avanza sin lo obligatorio y avanza con ello", async ({ page }) => {
    await page.goto("/speakers/postular", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Este campo es obligatorio").first()).toBeVisible();

    await page.getByPlaceholder("El título que verán los asistentes").fill("Serverless sin miedo");
    await page.getByLabel(/^Descripción/).fill("Una charla de prueba sobre funciones, colas y eventos para quien empieza.");
    await page.getByRole("button", { name: /AWS Foundations/ }).first().click();
    await page.getByRole("button", { name: "Principiante" }).click();
    await page.locator("form").getByRole("button", { name: "Español", exact: true }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();

    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByPlaceholder("El título que verán los asistentes")).toHaveValue("Serverless sin miedo");
  });
});
