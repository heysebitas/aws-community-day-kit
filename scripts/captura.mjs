/**
 * Captura una página entera con Chrome, para la documentación y para revisar
 * un cambio de diseño sin abrir el navegador.
 *
 *   node scripts/captura.mjs <url> <salida.png> [ancho=1440] [alto=900]
 *
 * Usa el Chrome instalado (o el de `CHROME=/ruta/al/chrome`) por su puerto de
 * depuración; no hace falta instalar nada. Las animaciones de entrada se
 * desactivan: en una captura no hay scroll que las dispare y el contenido
 * saldría invisible.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Node 20 trae WebSocket solo con una bandera; sin ella, el script se relanza con ella.
if (typeof WebSocket === "undefined") {
  const hijo = spawn(process.execPath, ["--experimental-websocket", ...process.argv.slice(1)], { stdio: "inherit" });
  hijo.on("exit", (codigo) => process.exit(codigo ?? 1));
  await new Promise(() => {});
}

const [url, salida, ancho = "1440", alto = "900"] = process.argv.slice(2);
if (!url || !salida) {
  console.error("Uso: node scripts/captura.mjs <url> <salida.png> [ancho] [alto]");
  process.exit(1);
}

const CANDIDATOS = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const chrome = CANDIDATOS.find((c) => fs.existsSync(c));
if (!chrome) {
  console.error("No encontré Chrome. Indícalo con CHROME=/ruta/al/chrome");
  process.exit(1);
}

const puerto = 9300 + Math.floor(Math.random() * 500);
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "captura-"));
const proceso = spawn(chrome, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, `--window-size=${ancho},${alto}`, "about:blank",
], { stdio: "ignore" });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function pestana() {
  for (let i = 0; i < 50; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
      const p = lista.find((x) => x.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch { /* todavía arrancando */ }
    await esperar(200);
  }
  throw new Error("Chrome no respondió");
}

try {
  const ws = new WebSocket(await pestana());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));

  let id = 0;
  const pendientes = new Map();
  const errores = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendientes.has(m.id)) {
      pendientes.get(m.id)(m.result ?? {});
      pendientes.delete(m.id);
    }
    if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errores.push(m.params.entry.text);
  });
  const cdp = (method, params = {}) =>
    new Promise((resolve) => {
      pendientes.set(++id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Log.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: Number(ancho), height: Number(alto), deviceScaleFactor: 1, mobile: Number(ancho) < 600 });
  await cdp("Page.navigate", { url });
  await esperar(4500);

  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const s = document.createElement("style");
      s.textContent = "*,*::before,*::after{animation-play-state:paused!important;transition:none!important}" +
        "[style*='opacity: 0'],[style*='opacity:0']{opacity:1!important;transform:none!important;clip-path:none!important}" +
        "[style*='clip-path']{clip-path:none!important}";
      document.head.appendChild(s);
    })()`,
  });
  await esperar(600);

  const { result } = await cdp("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true });
  const total = Math.min(Number(result.value) || Number(alto), 16000);
  const { data } = await cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: Number(ancho), height: total, scale: 1 },
  });
  fs.writeFileSync(salida, Buffer.from(data, "base64"));
  console.log(`${salida}  ${ancho}×${total}`);
  if (errores.length) console.log(`Errores en la consola (${errores.length}):\n  ` + [...new Set(errores)].slice(0, 12).join("\n  "));
  ws.close();
} finally {
  proceso.kill();
  await esperar(300);
  fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 3 });
}
