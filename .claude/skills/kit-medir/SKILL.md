---
name: kit-medir
description: "Úsala cuando quieras medir Lighthouse y el bundle de páginas públicas para detectar regresiones de rendimiento."
---

# Medir el kit

## Requisitos

- **Chrome o Chromium** instalado. Si no está en una ruta habitual, define `CHROME_PATH`.
- La CLI **`lighthouse`** instalada de forma global o disponible en `node_modules/.bin/lighthouse`. No forma parte de las dependencias del kit.
- Un build de producción y un servidor ya levantado: `scripts/medir.mjs` mide el servidor que recibe `--url`, no lo construye.

## Pasos

1. Elige las páginas públicas afectadas. Por defecto, `scripts/medir.mjs` mide `/`, `/speakers`, `/registro` y `/directorio`; también acepta una lista separada por comas con `--rutas`.
2. Genera el build que se va a medir:

   ```bash
   npm run build
   ```

3. En otra terminal levanta ese build con la base en memoria. En producción hace falta un secreto de sesión aunque la demo no use cuentas reales:

   ```bash
   JWT_SECRET="$(openssl rand -hex 32)" MODO_DEMO=1 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run start
   ```

4. Ejecuta la medición móvil. Son tres pasadas por página y se usa la mediana:

   ```bash
   npm run medir -- --url http://localhost:3000
   ```

5. Compara con la línea base del proyecto cuando exista:

   ```bash
   npm run medir -- --url http://localhost:3000 --comparar
   ```

   El script sale con código 1 si encuentra una regresión. Si la línea base no existe, lo dice; no la reemplaces con `--guardar-base` sin revisar y aceptar deliberadamente ese nuevo punto de partida.
6. Resume en el informe el rendimiento, accesibilidad, SEO, FCP, LCP, TBT, CLS, peso y JS de primera carga. Destaca cada regresión y su magnitud; no escondas una variación porque el resto haya mejorado.

## Comprobación final

```bash
npm run medir -- --url http://localhost:3000
```

El comando debe terminar con código 0. Si el proyecto tiene línea base, la comparación final también debe terminar con código 0 y decir que no hay regresiones:

```bash
npm run medir -- --url http://localhost:3000 --comparar
```

Si faltan Chrome o `lighthouse`, el resultado no es una medición válida: deja constancia del requisito que falta. Si no existe una línea base, no inventes una comparación ni actualices el punto de partida sin acuerdo.
