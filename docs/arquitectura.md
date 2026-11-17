# Arquitectura

Una sola aplicación de Next.js 16 (App Router) con React 19 y Tailwind 4, sobre
una base compatible con MongoDB. Sin microservicios ni colas: un evento de
cientos o pocos miles de personas cabe en un proceso.

## La edición y el kit

```
evento/config.ts ──► src/config/definir.ts ──► src/config/index.ts
   (lo que tú escribes)   (valida y completa)     (EVENTO, PAIS, TEMA, IDIOMAS…)
```

`definirEvento` comprueba la configuración al cargar y falla con un mensaje
claro. El resto del código importa de `@/config`, nunca de `evento/` a mano
(salvo las listas de contenido, por `@evento/*`). Del país salen la zona
horaria, los documentos y la ley de datos (`src/config/paises.ts`); del tema,
cuatro colores que llegan al CSS como variables `--tema-*` en `<html>`.

## Rutas

```
src/app/[locale]/             páginas públicas, con prefijo de idioma opcional
src/app/[locale]/admin/       el panel
src/app/api/                  la API (JSON)
src/app/llms.txt, robots.ts, sitemap.ts, manifest.ts, icon.tsx
src/proxy.ts                  idioma y protección del panel (el «middleware» de Next 16)
```

El idioma principal va sin prefijo (`/registro`); los demás, con él (`/en/registro`).

## Datos

Modelos de Mongoose en `src/models/`. Cada fichero es un esquema; la tabla
los lista todos, con lo que guardan y qué índices únicos tienen:

| Fichero | Qué guarda | Índices únicos |
|---|---|---|
| `agenda-event` | Un bloque de la agenda: título, ponente, hora, sala, track, nivel, idioma | — |
| `email-campana` | Una campaña: plantilla, asunto, audiencia, estado y contadores | — |
| `email-cerrojo` | Un cerrojo con caducidad, para que dos envíos no se pisen (la clave es el identificador) | la clave |
| `email-envio` | Un envío: a quién, con qué plantilla, en qué estado y con qué identificador del proveedor | — |
| `email-template` | Una plantilla editable: slug, asunto, bloques, audiencia | slug |
| `envios-masivos` | No es un modelo: el helper que anota un tramo de envío y marca el «ya lo recibió» | — |
| `event-config` | Lo que se cambia sobre la marcha: enlaces, llamadas a la acción y carpeta del track | — |
| `faq` | Las preguntas frecuentes del sitio, en español e inglés, con sus botones | — |
| `form` | El estado de cada formulario público: abierto, publicado y tope de respuestas | el tipo de formulario |
| `log` | El registro de acciones del panel: quién, qué y cuándo | — |
| `passport` | El pasaporte digital: nombre, foto, sellos, salas, comidas y redes | el código corto |
| `passport-edit-token` | Los cambios pendientes de un pasaporte, con su token de un solo uso | el token |
| `password-token` | El enlace de un solo uso para que una cuenta nueva elija contraseña | el token |
| `print-config` | Un preset de impresión de escarapelas: medidas, campos, orientación y alineación | — |
| `registration` | Los asistentes: datos, documento, QR, check-in, consentimiento y estado del correo | el correo y el código QR |
| `room` | Las salas: nombre, aforo, enlace virtual y track | — |
| `session` | Las sesiones del panel: usuario, sesión vigente y caducidad | el identificador de sesión |
| `setting` | Ajustes sueltos: clave y valor | la clave |
| `speaker-profile` | Las propuestas y las fichas de speakers: datos, charla, estado y tarjeta | el slug |
| `sponsor-pin` | Los patrocinadores con su PIN de cuatro dígitos y los sellos que han dado | el PIN |
| `survey-recipient` | Los destinatarios de la encuesta post-evento y quién la abrió | el token; y el par de origen |
| `user` | Las cuentas del panel: rol, permisos por sección y badges permitidos | el correo |
| `volunteer-submission` | Las postulaciones de voluntariado: datos, documento, disponibilidad y contacto de emergencia | el correo |

Además de los índices únicos, cada esquema lleva sus índices de búsqueda: el
campo de palabras normalizadas de asistentes y pasaportes sirve para encontrar
a alguien en la puerta, y hay índices de texto, de fecha y de estado para los
listados del panel. El diagrama de cómo se relacionan está en
[datos.md](datos.md).

## Lo que se genera

Nada de imágenes horneadas: todo sale del tema y de la configuración.

- **Imágenes** (Open Graph, icono, encabezado de correo, tarjetas de speaker):
  `next/og` en `src/app/api/marca/`, `src/app/api/og/` y `src/lib/marca.tsx`.
- **PDF** (pase, carta de aceptación, carta de invitación, certificado):
  PDFKit en `src/lib/pdf/`. El certificado oficial de un SCD es la excepción:
  se escribe con pdf-lib sobre la plantilla del programa.
- **Correos**: bloques → HTML con React Email (`src/emails/`).

## Textos

`src/messages/{es,en}.json` con next-intl. Los datos de la edición entran como
`[[tokens]]` que se resuelven al cargar (`src/i18n/tokens.ts`), así un texto
nunca queda desactualizado respecto a la configuración.

## Para máquinas

`/llms.txt` y `/llms-full.txt` (Markdown), `/api/evento` (JSON) y JSON-LD en
cada página salen de la misma función, `datosDelEvento` en `src/lib/llm.ts`:
lo que lee una persona y lo que lee un modelo no pueden contradecirse.

## Pruebas

`tests/*.test.ts` con el runner de Node (`npm test`). Cubren lo que no se ve a
simple vista: audiencias, permisos, choques de agenda, bloques de correo, PDF,
seguridad de subidas y que los dos idiomas tengan las mismas claves.
