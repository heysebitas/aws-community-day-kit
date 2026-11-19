// El dashboard del panel abierto y sin tocarlo no debe tener el hilo principal ocupado (animaciones, intervalos, gráficas).
// Se corre con `npx playwright test` contra la demo ya levantada (ver docs/pruebas.md).
import { test, expect } from "@playwright/test";

const VENTANA_MS = 5000;
const MAXIMO = 0.15;

test("panel en reposo: el hilo principal no pasa del 15 % ocupado en 5 s", async ({ page }) => {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("demo@example.com");
  await page.locator('input[type="password"]').fill("demo-demo-demo");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin(?!\/login)/);
  await page.goto("/admin", { waitUntil: "networkidle" });
  // Que termine de pintar y de hidratar antes de empezar a contar.
  await page.waitForTimeout(2000);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const leer = async () => {
    const { metrics } = await cdp.send("Performance.getMetrics");
    const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
    return { tarea: m.TaskDuration, reloj: m.Timestamp };
  };

  const antes = await leer();
  await page.waitForTimeout(VENTANA_MS);
  const despues = await leer();

  // TaskDuration y Timestamp van en segundos.
  const ocupado = (despues.tarea - antes.tarea) / (despues.reloj - antes.reloj);
  expect(ocupado, `hilo principal ocupado ${(ocupado * 100).toFixed(1)} % en reposo (máximo ${MAXIMO * 100} %)`).toBeLessThanOrEqual(MAXIMO);
});
