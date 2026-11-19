# Guía para asistentes de IA

Este repo es **AWS Community Day Kit**: el sitio, los formularios y el panel de
operación de un AWS Student Community Day o de cualquier Community Day
(registro, speakers, voluntarios, agenda, check-in con QR, pasaporte digital,
correos, escarapelas, certificados). Una edición se configura sin tocar el
código del kit. Todo el repo —código, comentarios y documentación— está en español.

## Empieza aquí

```bash
node --version          # 20.19 o más
npm install
npm run demo            # http://localhost:3000 con datos de ejemplo; no necesita cuentas ni llaves
```

Con la demo corriendo ya puedes ver y probar todo:

| Qué | Dónde |
|---|---|
| El sitio | `http://localhost:3000` (inglés en `/en`) |
| El panel | `/admin/login` → `demo@example.com` / `demo-demo-demo` (rol admin) |
| Otras cuentas | `organiza@example.com` (organizador) y `puerta@example.com` (voluntario), misma contraseña |
| Un pasaporte | `/pasaporte/demo00000001`, PIN `1234`; PIN de stand para sellar: `4821` |
| Lo que lee un LLM | `/llms.txt`, `/llms-full.txt`, `/api/evento` |

Los datos de ejemplo (`src/lib/demo.ts`) son inventados y viven en memoria: se
pierden al cerrar la demo. Nunca apuntes la demo a una base real.

## Qué te pidieron

| Si te piden… | Lee primero | Y luego |
|---|---|---|
| «Configura mi evento» / «monta mi SCD» | [`docs/asistente.md`](docs/asistente.md) | Es una entrevista y tres comandos |
| Cambiar un texto del sitio | `.claude/skills/kit-texto/SKILL.md` | `src/messages/*.json`, en los dos idiomas |
| Cambiar o crear un correo | `.claude/skills/kit-correo/SKILL.md` | [`docs/correo.md`](docs/correo.md) |
| Crear o tocar una ruta de la API | `.claude/skills/kit-ruta-api/SKILL.md` | [`docs/seguridad.md`](docs/seguridad.md) |
| Colores o un tema nuevo | [`docs/temas.md`](docs/temas.md) | `src/config/temas.ts` |
| Un país: documentos, teléfono, ley de datos | [`docs/paises.md`](docs/paises.md) | `src/config/paises.ts` |
| Roles y permisos del panel | [`docs/panel.md`](docs/panel.md) | `src/lib/permisos.ts` |
| El día del evento (puerta, escáneres, límites de la sede) | [`docs/dia-del-evento.md`](docs/dia-del-evento.md) | `src/lib/escaneo-cliente.ts` |
| Los modelos y la base | [`docs/datos.md`](docs/datos.md) | [`docs/base-de-datos.md`](docs/base-de-datos.md) |
| Publicarlo | [`docs/despliegue.md`](docs/despliegue.md) | [`docs/bucket.md`](docs/bucket.md) |
| Rendimiento o Lighthouse | `.claude/skills/kit-medir/SKILL.md` | [`docs/rendimiento.md`](docs/rendimiento.md) |
| Algo no funciona | [`docs/troubleshooting.md`](docs/troubleshooting.md) | |
| Revisar un cambio | `.claude/agents/revisor-kit.md` | `.claude/skills/kit-verificar/SKILL.md` |
| Rehacer las capturas de la documentación | [`docs/galeria.md`](docs/galeria.md) | `npm run galeria` |

Las skills son Markdown normal: si tu herramienta no las carga sola, ábrelas y
sigue los pasos. Kiro tiene las mismas en `.kiro/steering/`.

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
npm run demo                  # el sitio con base en memoria y datos de ejemplo
npm run demo -- --produccion  # lo mismo, compilado: más lento al arrancar, rápido después
npm run setup                 # escribe evento/config.ts (interactivo, o --desde respuestas.json)
npm run doctor                # qué falta en la configuración y en el entorno
npm run check                 # tipos + lint + pruebas: tiene que pasar antes de dar algo por hecho
npm run build
npm run galeria               # rehace las capturas de docs/img/galeria (con la demo corriendo)
npm run medir                 # Lighthouse sobre la demo (ver docs/rendimiento.md)
npm run crear-admin           # la primera cuenta del panel en una base real
```

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

`npm run check` y `npm run build` en verde. Si cambiaste algo visible, míralo
con tus ojos, no lo des por bueno porque compila:

```bash
npm run demo -- --produccion        # en otra terminal
node scripts/captura.mjs http://localhost:3000/ captura.png            # página entera, escritorio
node scripts/captura.mjs http://localhost:3000/ movil.png 390 844      # teléfono
CAPTURA_SOLO_VISTA=1 node scripts/captura.mjs http://localhost:3000/registro vista.png
```

Para una pantalla del panel, `npm run galeria -- --solo panel-inicio` entra con
la cuenta de la demo. Si el cambio altera algo que sale en
`docs/img/galeria/`, rehaz esas capturas en el mismo cambio.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
