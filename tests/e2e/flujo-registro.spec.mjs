// Flujo completo contra la demo: registro → confirmación → check-in en el panel.
// Se corre con `npx playwright test` con la demo ya levantada (ver docs/pruebas.md).
import { test, expect } from "@playwright/test";

const CUENTA = { correo: "demo@example.com", clave: "demo-demo-demo" };

async function entrar(page) {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(CUENTA.correo);
  await page.locator('input[type="password"]').fill(CUENTA.clave);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin(?!\/login)/);
}

test("registro → confirmación → check-in en el panel", async ({ page, request }) => {
  const marca = Date.now().toString(36);
  const apellido = `Probador${marca}`.replace(/[^a-zA-Z]/g, "x");
  const correo = `e2e-${marca}@example.com`;

  // 1) La página de registro abre y la API acepta un registro online.
  const registro = await page.goto("/registro");
  expect(registro?.status()).toBe(200);
  const res = await request.post("/api/registrations", {
    data: {
      data: {
        // Online: no pide documento, que cambia según el país de la edición.
        firstName: "Ana", lastName: apellido, email: correo, attendance: "online",
        role: "Prueba", entityType: "none", acceptCoc: true, acceptPrivacy: true,
      },
      captchaToken: "demo",
    },
  });
  expect(res.status(), await res.text()).toBeLessThan(300);
  // Toda respuesta de la API trae el id de la petición.
  expect(res.headers()["x-request-id"]).toBeTruthy();

  // 2) Con la cuenta del panel se ve el registro y su código QR.
  await entrar(page);
  const lista = await page.request.get("/api/registrations?limit=50");
  expect(lista.ok()).toBeTruthy();
  const { registrations } = await lista.json();
  const reg = registrations.find((r) => r.email === correo);
  expect(reg, "el registro nuevo sale en el panel").toBeTruthy();

  // 3) El enlace de confirmación abre; si el periodo de la demo ya cerró, se anota y se sigue.
  const estado = await request.get(`/api/confirm/${reg.qrCode}`);
  if (estado.ok() && (await estado.json()).status === "pending") {
    await page.goto(`/confirmar/${reg.qrCode}`, { waitUntil: "networkidle" });
    await expect(page.getByText("Enlace no válido")).toHaveCount(0);
    const conf = await request.post(`/api/confirm/${reg.qrCode}`, {
      data: { badgeFirstName: "Ana", badgeLastName: apellido },
    });
    expect(conf.status(), await conf.text()).toBe(200);
  } else {
    test.info().annotations.push({ type: "aviso", description: "la confirmación no está abierta en esta demo: se omite ese paso" });
  }

  // 4) Check-in manual en el panel.
  await page.goto("/admin/check-in", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Manual" }).click();
  await page.getByPlaceholder("Buscar por nombre, apellido o documento...").fill(apellido);
  await page.getByRole("button", { name: new RegExp(apellido, "i") }).first().click();
  await page.getByRole("button", { name: "HACER CHECK-IN" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  const despues = await page.request.get("/api/registrations?limit=50");
  const { registrations: ahora } = await despues.json();
  expect(ahora.find((r) => r.email === correo)?.checkedIn).toBe(true);
});
