# Guía para asistentes de IA

Este repo es **AWS Community Day Kit**: el sitio, los formularios y el panel de
operación de un Student Community Day (registro, speakers, voluntarios, agenda,
check-in con QR, pasaporte digital, correos, escarapelas, certificados). Una edición se configura sin
tocar el código del kit.

Si alguien te pide **«configura mi evento»**, sigue [`docs/asistente.md`](docs/asistente.md):
es una entrevista corta y tres comandos.

## La regla que importa

Todo lo de **una edición** vive en dos carpetas:

| Carpeta | Qué hay |
|---|---|
| `evento/` | `config.ts` (tipo de evento, nombre, país, fecha, sede, tema), `equipo.ts`, `keynotes.ts`, `patrocinadores.ts`, `comunidades.ts`, `grupos.ts`, `tracks.ts`, `contacto.ts` |
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

## Skills para desarrollar el kit

Para **desarrollar el kit** —no para configurar una edición— sigue el
procedimiento de la skill que corresponda. Codex, Cursor y otros asistentes
pueden leer el mismo Markdown:

| Skill | Cuándo usarla | Pasos |
|---|---|---|
| `kit-ruta-api` | Crear o revisar una ruta de `src/app/api/` | `.claude/skills/kit-ruta-api/SKILL.md` · `.kiro/steering/kit-ruta-api.md` |
| `kit-medir` | Medir Lighthouse y el bundle | `.claude/skills/kit-medir/SKILL.md` · `.kiro/steering/kit-medir.md` |
| `kit-verificar` | Dar por terminado un cambio | `.claude/skills/kit-verificar/SKILL.md` · `.kiro/steering/kit-verificar.md` |
| `kit-texto` | Añadir o revisar textos del sitio | `.claude/skills/kit-texto/SKILL.md` · `.kiro/steering/kit-texto.md` |
| `kit-correo` | Añadir o revisar un correo | `.claude/skills/kit-correo/SKILL.md` · `.kiro/steering/kit-correo.md` |

Para revisar un diff sin tocar archivos, usa el subagente
`.claude/agents/revisor-kit.md`.

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
recursos/               donde cada SCD pone la plantilla de su certificado oficial (no se sube)
docs/                   la documentación; cada tema en un archivo corto
```

## Convenciones

- **Next.js 16.** Tiene cambios respecto a versiones anteriores: el middleware
  es `src/proxy.ts` y la documentación de la versión instalada está en
  `node_modules/next/dist/docs/`. Léela antes de usar una API de la que dudes.
- **Layouts dinámicos**: `connection()` o cualquier API dinámica (`cookies()`,
  `headers()`) en un layout vuelve dinámico todo lo que cuelga de él; compara
  fechas en el cliente o usa `revalidate`.
- **Envíos masivos**: Un envío masivo registra lo enviado por tramos y lleva
  cerrojo contra envíos simultáneos.
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
  su texto de fábrica en `src/emails/semilla.ts`. Todos los correos son
  bloques, también la invitación al panel, la confirmación del pasaporte, la
  propuesta recibida y el certificado: no hay componentes de React de correo y
  un correo nuevo se hace con bloques. No hay excepciones.
- **Seguridad**: toda ruta de `src/app/api/` que no sea pública empieza por
  `requireAuth` / `requireAccess` / `requireAnyAccess` (basta con tener acceso a
  una de varias secciones) / `requireDelete` (las que borran). Lo público lleva
  límite de peticiones y, si escribe, captcha. Las URL que llegan de un
  formulario se validan (`normalizeLink`, `esDelBucket`). Detalle en
  `docs/seguridad.md`; los roles y los niveles, en `docs/panel.md`.
- **Comentarios**: en español, cortos, y sólo para el porqué que el código no
  dice. Sin historia de cómo era antes.

## Lo que no se hace

- No subas `.env.local` ni pongas secretos, correos reales o enlaces de grupos
  privados en el repo. Tampoco material de terceros que no se pueda redistribuir,
  como la plantilla del certificado oficial.
- No escribas direcciones de correo en claro en una página: usa `ObfuscatedEmail`.
- No envíes correos ni ejecutes acciones contra una base real para «probar»:
  para eso está `npm run demo`.
- No hagas commit ni push si no te lo piden.

## Antes de terminar

`npm run check` y `npm run build` en verde. Si cambiaste algo visible, míralo:
`npm run demo` y `node scripts/captura.mjs http://localhost:3000/ captura.png`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
