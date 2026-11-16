# Contenido

Lo que cambia poco y conviene tener versionado está en archivos de `evento/`.
Lo que cambia durante la operación está en la base y se edita desde el panel.

## En archivos (`evento/`)

| Archivo | Qué lleva | Imágenes |
|---|---|---|
| `equipo.ts` | Organizadores: nombre, rol, redes | `public/evento/equipo/` |
| `keynotes.ts` | Keynotes; el primero sale destacado | `public/evento/keynotes/` |
| `patrocinadores.ts` | Patrocinadores por nivel | `public/evento/patrocinadores/` |
| `comunidades.ts` | Comunidades aliadas | `public/evento/comunidades/` |
| `grupos.ts` | Los grupos estudiantiles que organizan | |
| `tracks.ts` | Los tracks del evento | |
| `contacto.ts` | Correos de contacto, privacidad y patrocinios | |

Cada archivo exporta una lista tipada: el editor te avisa si falta un campo, y
los tipos están en `src/config/contenido.ts`. Una lista vacía (`[]`) esconde su
sección.

**Imágenes.** Las rutas son relativas a `public/` (`"/evento/equipo/ana.webp"`).
Fotos cuadradas de 600 px o más; logos en SVG o PNG con fondo transparente,
pensados para verse sobre negro. `npm run doctor` avisa si una ruta no existe.

**Tracks.** `evento/tracks.ts` es la única lista: la usan la portada, el
formulario de speakers, la revisión de propuestas y la agenda. El `id` de un
track queda guardado en cada propuesta, así que no lo cambies con la
convocatoria ya abierta.

**Correos de contacto.** En el sitio nunca salen escritos en claro: se arman
en el navegador para que no los recojan los rastreadores de spam.

## En el panel

| Qué | Dónde |
|---|---|
| Abrir y cerrar formularios, enlaces, salas | Configuración del evento |
| Speakers y sus charlas | Speakers (salen de las propuestas aceptadas) |
| Agenda | Programa |
| Preguntas frecuentes | FAQ |
| Plantillas de correo y campañas | Correos |
| Cuentas del equipo y permisos | Usuarios |

## Datos de demostración

El kit viene con personas y logos inventados para que la demo no se vea vacía.
Bórralos antes de publicar: `npm run doctor` avisa mientras queden correos de
ejemplo o la edición «Demo».
