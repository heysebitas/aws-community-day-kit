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

Modelos de Mongoose en `src/models/`. Los principales:

| Modelo | Qué guarda |
|---|---|
| `Registration` | Asistentes: datos, QR, confirmación, check-in |
| `SpeakerProfile` | Propuestas del CFP y el perfil público de quien fue aceptado |
| `VolunteerSubmission` | Postulaciones de voluntariado |
| `AgendaEvent`, `Room` | Programa y salas |
| `Passport` | Pasaporte digital y sellos |
| `EventConfig` | Lo que se cambia desde el panel: formularios abiertos, enlaces |
| `EmailTemplate`, `EmailCampana`, `EmailEnvio` | Plantillas, campañas y el registro de cada envío |
| `User`, `Log` | Cuentas del panel y registro de acciones |

Los nombres exactos están en la carpeta; cada esquema documenta sus campos.

## Lo que se genera

Nada de imágenes horneadas: todo sale del tema y de la configuración.

- **Imágenes** (Open Graph, icono, encabezado de correo, tarjetas de speaker):
  `next/og` en `src/app/api/marca/`, `src/app/api/og/` y `src/lib/marca.tsx`.
- **PDF** (pase, carta de aceptación, carta de invitación, certificado):
  PDFKit en `src/lib/pdf/`.
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
