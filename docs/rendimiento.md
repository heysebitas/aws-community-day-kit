# Rendimiento

## Medir

Contra un servidor ya levantado (Lighthouse y Chromium tienen que estar instalados):

```bash
npm run build && MODO_DEMO=1 npm start      # en otra terminal
npm run medir -- --url http://localhost:3000
npm run medir -- --url http://localhost:3000 --comparar
```

Mide `/`, `/speakers`, `/registro` y `/directorio` en móvil, 3 pasadas y mediana
(`--pasadas`, `--rutas /,/en`). Escribe `medidas/actual.json` con rendimiento,
accesibilidad, SEO, FCP, LCP, TBT, CLS, peso (KB) y JS de primera carga (KB gzip,
sacado de los `<script>` del HTML y de `.next/`). `--guardar-base` lo guarda también
como `medidas/linea-base.json`; `--comparar` lo contrasta con ella y sale con
código 1 si hay regresiones (tolerancias en `scripts/medir-lib.mjs`).

Sin Chromium o sin `lighthouse` el script lo dice y sale con código distinto de 0.
Con `CHROME_PATH` se indica el navegador.

## Fuentes

Las tres fuentes se precargan y usan `display: swap`. Se probó quitar el `preload` de
Handjet (`.dot-matrix`): el FCP en móvil subió de 1,06 a 1,36 s y la portada bajó un
punto, porque Handjet pinta el titular del hero.

## `experimental.inlineCss`: apagado

Medido con `npm run build && npm start` y `curl` sobre la portada (`/`), gzip -9:

| | HTML | HTML gzip |
|---|---|---|
| Sin `inlineCss` | 144 KB | 24,0 KB |
| Con `inlineCss` | 546 KB | 84,0 KB |

El CSS pesa unos 20 KB gzip, pero el HTML crece 60 KB porque el CSS viaja en el
documento y otra vez en la carga RSC. Pasa del tope de 25 KB, así que no se activa.
