# Pruebas

Las pruebas son de Node, sin framework: `node:test` con `assert`. No hay que
levantar el sitio ni la base de datos a mano.

## Correrlas

```bash
npm test              # sólo las pruebas
npm run check         # tipos + lint + pruebas: lo que tiene que pasar
npm run typecheck     # sólo los tipos
npm run lint          # sólo eslint
```

`npm test` corre `tests/*.test.ts` con `tsx` (TypeScript directo, sin
compilar). El runner es el de Node. Para ver sólo una parte hay que pasar el
filtro **antes** de los archivos:

```bash
npx tsx --import ./scripts/sin-server-only.mjs --test --test-name-pattern="permisos" tests/*.test.ts
```

Las pruebas que necesitan base de datos levantan su propio MongoDB en
memoria (`mongodb-memory-server`), así que no hace falta tener MongoDB ni
crear una cuenta en la nube. Los datos se borran al terminar.

## Qué se prueba

| Archivo | Qué mira |
|---|---|
| `agenda-conflictos`, `agenda-sala` | Choques de horario y reparto por sala |
| `audiencias` | Los filtros de las audiencias de correo |
| `bloques-condiciones`, `bloques-correo`, `cinta-correo`, `campana-correo`, `flujos-correo`, `correo-auth` | Los bloques de las plantillas, el renderizado y los correos del sistema |
| `cfp-estado` | El estado de la convocatoria de speakers |
| `duplicados` | Correos repetidos entre registros y postulaciones |
| `dialogos`, `sin-dialogos-nativos` | Que no aparezcan `alert`, `confirm` ni `prompt` |
| `datos-edicion` | Que los datos de la edición no queden escritos en el kit |
| `enlaces` | Los enlaces del sitio: que sean válidos y del bucket |
| `escaneos-atomicos` | Que dos escaneos a la vez no cuenten dos veces |
| `flujos-registro-checkin`, `flujos-validacion` | El camino completo: registro → correo → pase → check-in |
| `mensajes`, `mensajes-cliente` | Que los dos idiomas tengan las mismas claves |
| `pdf` | Que los PDF del kit quepan en una hoja |
| `permisos`, `permisos-rutas` | La tabla de permisos y que cada ruta de la API compruebe el suyo |
| `ratelimit-publico`, `timeouts` | Los límites de peticiones y los tiempos de espera |
| `resend-indice`, `envios-masivos` | El registro de cada envío y el marcado de «ya lo recibió» |
| `seguridad`, `seguridad-cabeceras` | Captcha, subidas, cabeceras y la política de contenido |
| `server-only` | Que los módulos de servidor no se importen en el navegador |
| `subidas`, `cache-publica`, `cache-control-bucket` | Qué se puede subir y qué se sirve de cada origen |
| `temas`, `session-tracks` | Los temas de color y los tracks |
| `rendimiento-carga` | Que lo visible al cargar no venga con `opacity:0` |

## Dos variables para las pruebas

| Variable | Para qué |
|---|---|
| `PRUEBA_URL` | La dirección del sitio ya levantado. Con ella, las pruebas miran el **HTML servido** (por ejemplo, que el contenido del primer pantallazo no salga invisible). Sin ella, esas pruebas se saltan |
| `GUARDAR_PDF` | Una carpeta donde se guardan los PDF que generan las pruebas, para abrirlos y mirarlos |

```bash
PRUEBA_URL=http://localhost:3000 npm test
GUARDAR_PDF=/tmp/pdf npm test
```

## Qué se salta

- La prueba del **certificado oficial** de un Student Community Day salta si no
  está `recursos/certificado-sbg.pdf`: la plantilla es de Amazon y no viene en
  el kit (ver `docs/configuracion.md`).
- Las pruebas contra el HTML servido se saltan si no hay `PRUEBA_URL`.

## Escribir una prueba nueva

Un archivo en `tests/`, con el nombre `*.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { nivelDe } from "@/lib/permisos";

test("el nivel de una sección", () => {
  assert.equal(nivelDe({ role: "organizer" }, "correos"), "editar");
});
```

- Los alias `@/…` (src) y `@evento/…` (la edición) funcionan: los resuelve
  `tsx` con los `paths` del `tsconfig.json`.
- Los módulos con `import "server-only"` se pueden importar: `tsx` carga antes
  `scripts/sin-server-only.mjs`, que anula ese import.
- Para probar una ruta de la API, mira `tests/helpers/entorno.ts`: levanta la
  base en memoria, abre sesión y da una función para llamar al handler.

## Lo que las pruebas no comprueban

- Cómo se ve el sitio: eso se mira en el navegador (`npm run demo`) y con
  `node scripts/captura.mjs <url> <salida.png>`.
- Que el correo llegue de verdad al buzón de una persona: eso se prueba en un
  evento de prueba, no en una prueba automática.
- El rendimiento con carga real: eso se mide en el entorno del evento, con el
  sitio ya montado.
