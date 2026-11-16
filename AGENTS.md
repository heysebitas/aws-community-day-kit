# Guía para asistentes de IA

Este repo es **Community Day Kit**: el sitio, los formularios y el panel de
operación de un Student Community Day (registro, speakers, voluntarios, agenda,
check-in con QR, pasaporte digital, correos, escarapelas, certificados). Una edición se configura sin
tocar el código del kit.

Si alguien te pide **«configura mi evento»**, sigue [`docs/asistente.md`](docs/asistente.md):
es una entrevista corta y tres comandos.

## La regla que importa

Todo lo de **una edición** vive en dos carpetas:

| Carpeta | Qué hay |
|---|---|
| `evento/` | `config.ts` (nombre, país, fecha, sede, tema), `equipo.ts`, `keynotes.ts`, `patrocinadores.ts`, `comunidades.ts`, `grupos.ts`, `tracks.ts`, `contacto.ts` |
| `public/evento/` | Fotos y logos que esos archivos referencian |

Lo demás (`src/`) es el kit. Para montar un evento **no se edita `src/`**. Si un
dato de la edición está escrito en `src/`, es un error del kit: corrígelo
llevándolo a `evento/config.ts`, no dejando el valor fijo.

## Comandos

```bash
npm install
npm run setup      # escribe evento/config.ts (interactivo, o --desde respuestas.json)
npm run doctor     # dice qué falta en la configuración y en el entorno
npm run demo       # levanta el sitio con una base en memoria; no necesita ninguna cuenta
npm run check      # tipos + lint + pruebas: tiene que pasar antes de dar algo por hecho
npm run build
```

El panel en modo demo: `/admin/login`, `demo@example.com` / `demo-demo-demo`.

## Mapa del código

```
evento/                 la edición (ver arriba)
src/config/             tipos de la configuración, países de LATAM, temas, fechas
src/app/[locale]/       páginas públicas y panel (/admin), una carpeta por ruta
src/app/api/            la API; cada ruta comprueba su propia sesión
src/components/         sections/ (portada), forms/, admin/, ui/, effects/, layout/
src/lib/                auth, db, correo, s3, pdf/, audiencias, permisos, límites
src/models/             esquemas de Mongoose
src/emails/             bloques y plantillas de correo (el contenido es dato, no TSX)
src/messages/           textos del sitio (es.json, en.json)
tests/                  pruebas con el runner de Node
docs/                   la documentación; cada tema en un archivo corto
```

## Convenciones

- **Next.js 16.** Tiene cambios respecto a versiones anteriores: el middleware
  es `src/proxy.ts` y la documentación de la versión instalada está en
  `node_modules/next/dist/docs/`. Léela antes de usar una API de la que dudes.
- **Textos**: van en `src/messages/*.json`, en todos los idiomas a la vez (hay
  una prueba que lo exige). Los datos de la edición se escriben como
  `[[ciudad]]`, `[[fecha]]`, `[[evento]]`…; la lista está en `src/i18n/tokens.ts`.
  Nunca escribas un año, una ciudad o un país dentro de un texto.
- **Colores**: sólo los tokens del tema (`acento`, `acento-claro`,
  `acento-fuerte`, `acento-profundo`, `tinta`, `papel`, `surface-*`). Nada de
  hexadecimales del acento a mano: el tema se elige en la configuración. Donde
  no hay CSS (imágenes generadas, PDF, canvas) se usa `TEMA` de `@/config`.
- **Estilo**: esquinas rectas, bordes de 2px, sombras duras desplazadas,
  títulos en `.dot-matrix`, texto en monoespaciada, controles con `min-h-11`.
  Antes de crear un componente mira `src/components/admin/ui.tsx` y `src/components/ui/`.
- **Sin diálogos del navegador**: nada de `alert`, `confirm` ni `prompt`. Usa
  `useToast`, `useConfirm` y `usePrompt`. Hay una prueba que lo comprueba.
- **Correos**: una plantilla es una lista de bloques guardada en la base, con
  su texto de fábrica en `src/emails/semilla.ts`. No se añaden correos como TSX.
- **Seguridad**: toda ruta de `src/app/api/` que no sea pública empieza por
  `requireAuth` / `requireAccess`. Lo público lleva límite de peticiones y, si
  escribe, captcha. Las URL que llegan de un formulario se validan
  (`normalizeLink`, `esDelBucket`). Detalle en `docs/seguridad.md`.
- **Comentarios**: en español, cortos, y sólo para el porqué que el código no
  dice. Sin historia de cómo era antes.

## Lo que no se hace

- No subas `.env.local` ni pongas secretos, correos reales o enlaces de grupos
  privados en el repo.
- No escribas direcciones de correo en claro en una página: usa `ObfuscatedEmail`.
- No envíes correos ni ejecutes acciones contra una base real para «probar»:
  para eso está `npm run demo`.
- No hagas commit ni push si no te lo piden.

## Antes de terminar

`npm run check` y `npm run build` en verde. Si cambiaste algo visible, míralo:
`npm run demo` y `node scripts/captura.mjs http://localhost:3000/ captura.png`.
