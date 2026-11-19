# Rendimiento

## Medir

Contra un servidor ya levantado (Lighthouse y Chromium tienen que estar instalados):

```bash
npm run build && MODO_DEMO=1 npm start      # en otra terminal
npm run medir -- --url http://localhost:3000
npm run medir -- --url http://localhost:3000 --comparar
```

Mide `/`, `/speakers`, `/registro` y `/directorio` en móvil, 3 pasadas y mediana
(`--pasadas`, `--rutas /,/en`), y además lo que usa el staff con el móvil el día del
evento: `/admin` y `/admin/check-in` (con la sesión de la demo, `demo@example.com`) y
el pasaporte `/pasaporte/demo00000001`. Esas tres van con throttling real (`devtools`)
y CPU 6×; las públicas, con el simulado. Sigue siendo un aviso en el CI.

Si la herramienta falla en una página (`NO_NAVSTART`, respuesta que no es 200), la
reintenta una vez y, si vuelve a fallar, la anota como «sin medir» en
`medidas/actual.json` (`sinMedir: true`, `motivo`) en vez de tumbar el job. Escribe `medidas/actual.json` con rendimiento,
accesibilidad, SEO, FCP, LCP, TBT, CLS, peso (KB) y JS de primera carga (KB gzip,
sacado de los `<script>` del HTML y de `.next/`). `--guardar-base` lo guarda también
como `medidas/linea-base.json`; `--comparar` lo contrasta con ella y sale con
código 1 si hay regresiones (tolerancias en `scripts/medir-lib.mjs`).

Sin Chromium o sin `lighthouse` el script lo dice y sale con código distinto de 0.
Con `CHROME_PATH` se indica el navegador.

## Reposo del panel

`tests/e2e/reposo.spec.mjs` abre el dashboard de `/admin` 5 s sin tocar nada y falla
si el hilo principal está ocupado más del 15 % (`Performance.getMetrics` por CDP).

## Navegadores mínimos

Ver [navegadores.md](navegadores.md).

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

## Servidor

Medido con la imagen del `Dockerfile` en Docker (`--cpus=1 --memory=1g`, aarch64), la
semilla de la demo más 20 000 registros, Mongo fuera del contenedor y `autocannon`
8 s por ruta. La CPU de mongod no cuenta. Entre corridas varía ±30 %.

| | Antes (Alpine) | Ahora (Alpine) | Ahora (glibc, como pm2) |
|---|---|---|---|
| RSS en reposo | 114 MB | 116 MB | 110 MB |
| RSS caliente, tras GC | 184 MB | 190 MB | 201 MB |
| Pico (VmHWM) con la mezcla | 525 MB | 437–462 MB | 509 MB |
| RSS final, tras GC | 219 MB | 209 MB | 388 MB |
| `/api/marca/banner` c10 | 9 rps, p99 3,4 s | 520–620 rps, p99 90–440 ms | 623 rps, p99 110 ms |
| `/api/og/speaker` c10 | 7 rps, p99 2,2 s | 184–318 rps, p99 180–495 ms | 657 rps, p99 95 ms |

- Las imágenes de marca y las tarjetas de speaker se dibujan una vez y se sirven
  de memoria (`src/lib/cache-imagen.ts`, con tope de entradas y de bytes). La
  tarjeta cambia de clave cuando se edita el perfil.
- Lo que sube el pico ahora son las rutas dinámicas con 50 conexiones a la vez
  (`/api/evento`, `/speakers/[slug]`), no el heap (≤ 170 MB): sacarlas a ISR es
  lo siguiente. Bajar el heap a 192 MB o el semiespacio no lo cambió.
- Con nginx delante (`deploy/nginx/sitio.conf`), la portada y las imágenes ya
  cacheadas no llegan a Node.

## Modo modesto

Si el dispositivo es modesto (`deviceMemory` ≤ 2, `hardwareConcurrency` ≤ 4, ahorro de datos o red 2g/3g), un script del `<head>` pone `modesto` en `<html>` antes de pintar. Es automático y no hay interruptor. Con él los canvas pintan un solo fotograma (como con movimiento reducido), el CSS detiene las animaciones infinitas, los enlaces de la portada y la navegación no precargan y no se publican las reglas especulativas. La lógica está en `src/lib/dispositivo.ts`. Para probarlo, en DevTools emula red 3g o `Save-Data`, o en la consola `Object.defineProperty(navigator, "deviceMemory", { value: 1 })` y recarga; comprueba la clase `modesto` en `<html>`.
