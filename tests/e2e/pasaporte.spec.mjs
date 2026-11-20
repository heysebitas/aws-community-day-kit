// El pasaporte digital: abrirlo con el PIN de propietario y canjear un sello de stand.
// Se corre con `npx playwright test` con la demo ya levantada (ver docs/pruebas.md).
// Los PIN son los de la demo (src/lib/demo.ts): 1234 el del dueño, 4821 y 5932 los de los stands.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { vigilar } from "./ayuda.mjs";

/** La respuesta trae también la lista de patrocinadores: el sello está en `passport.stamps`. */
const tieneAws = (r) => (r.passport?.stamps ?? []).some((s) => s.sponsorName === "Amazon Web Services");

async function desbloquear(page, pin = "1234") {
  await page.getByRole("button", { name: /Editar/ }).first().click();
  await page.getByLabel("PIN de cuatro dígitos").fill(pin);
}

test("un pasaporte que no existe lo dice", async ({ page }) => {
  await page.goto("/pasaporte/noexiste0000", { waitUntil: "networkidle" });
  await expect(page.getByText("Pasaporte no encontrado")).toBeVisible();
});

test("el PIN equivocado no abre el modo propietario", async ({ page }) => {
  await page.goto("/pasaporte/demo00000001", { waitUntil: "networkidle" });
  await desbloquear(page, "0000");
  // Si la prueba se repite seguido, salta antes el límite de intentos: también vale.
  await expect(page.getByText("PIN incorrecto.").or(page.getByText(/Demasiados intentos/)).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Canjear sello" })).toHaveCount(0);
});

test("con el PIN se canjea un sello, y el mismo sello no se canjea dos veces", async ({ page }) => {
  const errores = vigilar(page);
  // En la demo los sellos duran hasta reiniciar el servidor: se busca un pasaporte sin el de AWS.
  let id = null;
  for (let i = 0; i < 40 && !id; i++) {
    const candidato = `demo${String(i).padStart(8, "0")}`;
    const r = await page.request.get(`/api/passport/${candidato}`);
    if (r.ok() && !tieneAws(await r.json())) id = candidato;
  }
  test.skip(!id, "todos los pasaportes de la demo ya tienen el sello: reinicia la demo");

  await page.goto(`/pasaporte/${id}`, { waitUntil: "networkidle" });
  await desbloquear(page);
  await expect(page.getByRole("button", { name: "Canjear sello" })).toBeVisible();

  await page.getByRole("button", { name: "Canjear sello" }).click();
  const sello = page.waitForResponse((r) => r.url().endsWith(`/api/passport/${id}/stamp`) && r.request().method() === "POST");
  await page.getByLabel("PIN de cuatro dígitos").last().fill("4821");
  expect([200, 201]).toContain((await sello).status());
  // El sello queda en el pasaporte.
  expect(tieneAws(await (await page.request.get(`/api/passport/${id}`)).json())).toBe(true);

  // Repetirlo choca siempre (por la API, para no ensuciar la consola con el 409 esperado).
  const otra = await page.request.post(`/api/passport/${id}/stamp`, { data: { pin: "4821" } });
  expect(otra.status()).toBe(409);
  // Un PIN de stand que no existe no sella.
  expect((await page.request.post(`/api/passport/${id}/stamp`, { data: { pin: "0000" } })).status()).toBeGreaterThanOrEqual(400);
  expect(errores, errores.join("\n")).toEqual([]);
});

test("la vista pública no ofrece canjear sellos", async ({ page }) => {
  await page.goto("/pasaporte/demo00000002", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Canjear sello" })).toHaveCount(0);
});

// El axe de axe.spec.mjs mira el pasaporte cerrado; los paneles del PIN sólo existen al abrirlos.
test("el panel del PIN es accesible", async ({ page }) => {
  await page.goto("/pasaporte/demo00000002", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Editar/ }).first().click();
  await expect(page.getByLabel("PIN de cuatro dígitos")).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const graves = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
});
