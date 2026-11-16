/**
 * Arranca el kit en modo demo:  npm run demo
 *
 * Sin cuentas ni variables de entorno: la base vive en memoria, los correos se
 * escriben en la consola y el captcha está apagado. Los datos se pierden al
 * cerrar. Para un evento real, sigue `docs/despliegue.md`.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puerto = process.env.PORT || "3000";

const env = {
  ...process.env,
  MODO_DEMO: "1",
  // Una clave distinta en cada arranque: las sesiones de la demo no sobreviven al reinicio.
  JWT_SECRET: process.env.JWT_SECRET || randomBytes(48).toString("base64"),
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${puerto}`,
};

console.log(`\n  Modo demo → http://localhost:${puerto}\n  Panel     → http://localhost:${puerto}/admin/login  (demo@example.com / demo-demo-demo)\n`);

const next = path.join(raiz, "node_modules", "next", "dist", "bin", "next");
const hijo = spawn(process.execPath, [next, "dev", "-p", puerto], { cwd: raiz, env, stdio: "inherit" });
hijo.on("exit", (codigo) => process.exit(codigo ?? 0));
