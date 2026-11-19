# Navegadores

## Mínimos

| Navegador | Versión mínima |
|---|---|
| Chrome / Edge | 111 |
| Safari (macOS e iOS) | 16.4 |
| Firefox | 128 |

El sitio usa colores `oklch()` y el selector `:has()`; con esas versiones ya existen
las dos cosas. En un navegador más viejo el sitio puede verse mal, así que
`src/components/layout/aviso-navegador.tsx` muestra una línea discreta arriba con el
mensaje `Nav.navegador_viejo` (en `src/messages/es.json` y `en.json`).

El aviso detecta por capacidades, no por user agent:
`CSS.supports("color", "oklch(0 0 0)")` y `CSS.supports("selector(:has(*))")`. Si falta
una, aparece. No aparece en el panel (`/admin`), y en el servidor y en la hidratación
no se pinta, para no cambiar el HTML inicial.

Si subes el mínimo, cambia la tabla de arriba, el texto de `Nav.navegador_viejo` en
los dos idiomas y, si hace falta, las capacidades que comprueba el componente.

Más sobre medir el rendimiento en [rendimiento.md](rendimiento.md).
