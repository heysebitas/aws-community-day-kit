# Política de contenido (CSP): medir y decidir

Estado: `script-src` sigue con `'unsafe-inline'`. Trusted Types va en
`Content-Security-Policy-Report-Only`. La decisión sobre el nonce es de quien
mantiene el kit; aquí están las cifras.

## Scripts en línea del HTML del build

Contados en `.next/server/app/es.html`, `es/speakers.html` y `es/registro.html`
(`<script>` sin `src`, sin contar los `application/ld+json` ni `speculationrules`,
que el navegador no ejecuta):

| Página | `<script>` | Con `src` | En línea ejecutables | Payload RSC | Fijos |
|---|---|---|---|---|---|
| `/` | 28 | 15 | 9 | 6 | 3 |
| `/speakers` | 29 | 16 | 9 | 6 | 3 |
| `/registro` | 27 | 14 | 9 | 6 | 3 |

Los 3 fijos son iguales en las tres páginas: `classList.add('js')` (el del
layout), el arranque `(self.__next_f=…).push([0])` y el registro de chunks de
Turbopack. Los 6 de payload RSC (`self.__next_f.push([1,"…"])`) llevan el
contenido de cada página: pesan 38–43 KB y cambian en cada ruta y en cada build.

## ¿Sirven los hashes?

No como sustituto de `'unsafe-inline'`:

- El payload RSC es distinto por página y se regenera en cada build; habría que
  hashearlo después del build e inyectar la lista en la cabecera por ruta.
- Con un hash (o nonce) en `script-src`, los navegadores **ignoran**
  `'unsafe-inline'`. Poner sólo el hash del script `js` bloquearía el resto
  de los scripts en línea y rompería la hidratación. Por eso no se añadió: mientras
  siga `'unsafe-inline'` no aporta nada y cambiaría el comportamiento.
- La alternativa que ofrece la documentación de Next (`experimental.sri`,
  hashes de los ficheros `.js`) cubre los scripts con `src`, no los en línea
  (`content-security-policy.md`, «Limitations of SRI»). La hipótesis de poder
  mantener estáticas las páginas con nonce queda refutada: la guía dice que con
  nonce todas las páginas deben renderizarse dinámicamente y que PPR es
  incompatible.

## Prueba con nonce (rama local, no commiteada)

Cambio mínimo: en `src/proxy.ts`, nonce por petición y CSP con
`'nonce-…' 'strict-dynamic'` en cabecera de petición y de respuesta; en
`src/app/[locale]/layout.tsx`, `await connection()`. Mismo `npm run build` y
`MODO_DEMO=1 npx next start`.

| | Antes | Con nonce |
|---|---|---|
| Rutas de página `●` (con locales) | 80 | 2 (sólo `opengraph-image`) |
| Rutas de página `○` | 5 | 5 |
| Rutas de página `ƒ` | 10 | 49 |
| Cabecera de caché de `/` | `s-maxage=120, stale-while-revalidate`; `x-nextjs-prerender: 1` | `private, no-cache, no-store` |
| TTFB de `/` (mediana de 10, `curl -w %{time_starttransfer}`, local) | ≈ 8 ms | ≈ 46 ms |

Se excluyen las rutas `/api`, que ya eran `ƒ`. Con nonce, 18 de los 24
`<script>` llevan `nonce`; los otros 6 son JSON no ejecutable. La medida es de
una microVM sin carga, sin CDN: la diferencia de ~38 ms es el coste de renderizar
la portada por petición; detrás de un CDN, además, se pierde la caché de borde.
Esto es el coste frente a #17.

## Lo que sí está aplicado

`Content-Security-Policy-Report-Only: require-trusted-types-for 'script'`
(`next.config.ts`). No bloquea nada. No hay endpoint de reportes en el kit, así
que no lleva `report-uri` ni `report-to`: las violaciones sólo se ven en la
consola del navegador. Para el criterio «sin violaciones en un recorrido
completo» falta ese recorrido con un navegador real (no hay uno en este nodo);
es probable que el runtime de Next y Turnstile aparezcan, por lo que hace falta
revisarlo antes de pasar la directiva a la CSP que bloquea.

La prueba de las cabeceras está en `tests/csp.test.ts`.

## Recomendación

Mantener `'unsafe-inline'` mientras #17 priorice las páginas estáticas (cuesta ≈ 38 ms de TTFB y 47 rutas más dinámicas, a cambio de una capa contra XSS que hoy ya reducen `object-src`, `base-uri` y la validación de entradas).
Si se decide el nonce, hacerlo en una sola pasada con `connection()` en el layout, y revisar antes los reportes de Trusted Types.
