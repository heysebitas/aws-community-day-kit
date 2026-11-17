import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const DIRECTIVA_CLIENTE = /^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*(?:\n|$))*["']use client["']/;

/** La configuración plana filtra por ruta; estos archivos se detectan por su directiva. */
function archivosCliente(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      salida.push(...archivosCliente(ruta));
    } else if (/\.[jt]sx?$/.test(entrada.name) && DIRECTIVA_CLIENTE.test(readFileSync(ruta, "utf8"))) {
      salida.push(path.relative(RAIZ, ruta).split(path.sep).join("/"));
    }
  }
  return salida;
}

const CLIENTES = archivosCliente(path.join(RAIZ, "src"));
const IMPORTES_DE_SERVIDOR = [
  "@/models/*",
  "@/lib/db",
  "@/lib/auth",
  "@/lib/s3",
  "@/lib/correo",
  "@/lib/env",
  "@/lib/captcha",
  "@/lib/log",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/**/*.{js,jsx,ts,tsx}", ...CLIENTES],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: IMPORTES_DE_SERVIDOR,
          message: "Este módulo sólo puede importarse desde el servidor.",
        }],
      }],
    },
  },
  {
    // Reglas del compilador de React que señalan patrones que funcionan pero
    // conviene reescribir. Avisan en vez de cortar el CI: se van corrigiendo
    // archivo por archivo, y cuando no quede ninguna vuelven a ser errores.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    // Las fotos del bucket ya pasan por `Foto` (next/image); los <img> que
    // quedan son SVG, data URLs, correos e imágenes generadas, donde el
    // optimizador de Next no aplica.
    rules: { "@next/next/no-img-element": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
