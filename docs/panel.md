# El panel

El panel de operación: `/admin/login`. Sirve para montar la operación del
evento (registros, agenda, correos, puerta, escarapelas) y para lo que se
decide sobre la marcha (abrir un formulario, mover a alguien de lista,
borrar una colección entera).

Dos cosas mandan sobre lo demás: el **rol** dice a qué panel entra cada
persona; los **permisos por sección** dicen hasta dónde llega dentro de él.
El catálogo está en `src/lib/permisos.ts` y el portero de las rutas en
`src/lib/auth.ts`.

## Entrar

- `/admin/login` con correo y contraseña. Las cuentas nuevas eligen su
  contraseña con un enlace de un solo uso (`/admin/create-password`).
- La sesión vive en una cookie `HttpOnly` firmada; **una sesión por cuenta**:
  entrar en otro dispositivo cierra la anterior.
- `src/proxy.ts` sólo manda al login a quien no tiene cookie. Quien de verdad
  protege los datos es cada ruta de la API, que comprueba su sesión y su
  permiso.

## Los roles

| Rol | Qué ve | Qué puede |
|---|---|---|
| `admin` | Todo el panel | Todo, sin mirar los permisos por sección: cuentas de staff, consola, reportes, certificados, encuesta, configuración, pasaportes, actividad |
| `organizer` | El panel y las secciones que le tocan | Lo que digan sus permisos por sección (ver más abajo) |
| `volunteer` | La operación: asistentes, check-in, impresión y los escáneres | Buscar y marcar check-in, escanear salas y almuerzos, imprimir escarapelas |
| `badges` | Sólo el escáner de badges | Dar sellos del pasaporte, y sólo de los patrocinadores que tenga asignados |

El rol `badges` es el más acotado: su lista `allowedBadges` dice qué
patrocinadores puede sellar. El admin puede dar cualquiera.

## Los niveles: ver, editar y borrar

Cada sección tiene un nivel. Los tres, de menos a más:

| Nivel | Qué permite |
|---|---|
| `no` | La sección no existe para esa cuenta |
| `ver` | Entrar y mirar: listados, búsqueda, exports |
| `editar` | Todo lo anterior, y cambiar: crear, editar, enviar, imprimir |

**Borrar va aparte** (`eliminar`) y viene apagado: hay que marcarlo, y sólo
cuenta si el nivel es `editar`. Es lo único sin vuelta atrás.

Sólo se miran los permisos cuando el rol es `organizer`; los demás siguen el
rol. Un organizador **sin permisos guardados tiene acceso a todo** (nivel
`editar`): es el estado de una cuenta recién creada, y «vacío» no puede
significar «nada».

Las casillas se marcan en **Cuentas de staff** (`/admin/users`), que es de
`admin` sólo.

## Las secciones

Las doce, con lo que hace quien tiene `editar`:

| Sección | Grupo | Qué puede hacer | ¿Se puede borrar? |
|---|---|---|---|
| Asistentes | Personas | Registrar a mano, editar datos, hacer check-in, reenviar el correo y exportar la lista | No |
| Voluntarios | Personas | Aprobar postulaciones, editar datos y exportar la lista | No |
| Speakers | Personas | Aprobar y rechazar propuestas, editar fichas, publicar en el sitio y exportar | Sí |
| Programa | Programa | Armar el horario, agendar a quien falta y administrar los salones | Sí |
| Check-in | Evento | Buscar a alguien y marcar su entrada el día del evento | No |
| Impresión | Evento | Imprimir escarapelas y marcar las que ya se entregaron | No |
| Escáner · Check-in | Escáner | El escáner de la puerta | No |
| Escáner · Salas | Escáner | Registrar quién entra a cada sala | No |
| Escáner · Almuerzos | Escáner | Marcar almuerzos y refrigerios entregados | No |
| Escáner · Dar badges | Escáner | Sellar el pasaporte | No |
| Correos | Sistema | Editar las plantillas, armar campañas y mandarlas | Sí |
| FAQ | Sistema | Escribir y ordenar las preguntas frecuentes del sitio | Sí |

El menú lateral agrupa las entradas como el panel: General, Personas,
Programa, Evento, Escáner, Datos y Sistema. Las entradas sin sección (tablero
en vivo, cuentas de staff, certificados, encuesta, configuración, consola,
reportes, actividad, pasaportes) se reparten por rol.

## Qué hay en cada parte

| Ruta | Qué se hace ahí |
|---|---|
| `/admin` | Resumen del evento |
| `/admin/evento` | Tablero en vivo: check-in, almuerzos, sellos y quién está en cada sala |
| `/admin/registrations` | Asistentes: alta manual, ficha, QR, check-in, reenvío de correo, export |
| `/admin/volunteers` | Postulaciones de voluntariado: aprobar, editar, mover a asistentes, certificado |
| `/admin/speakers` | Propuestas del CFP, fichas, publicación en el sitio y tarjetas |
| `/admin/programa` | Agenda (con detección de choques), salones y lo que falta por agendar |
| `/admin/check-in` | Buscar a alguien y marcar su entrada |
| `/admin/print` | Escarapelas: presets de impresión, generar el PDF y marcar las entregadas |
| `/admin/escaner/*` | Los cuatro escáneres con cámara: puerta, salas, almuerzos y badges |
| `/admin/pasaportes` | Pasaportes y **PIN de patrocinadores** (ver más abajo) |
| `/admin/correos` | Plantillas (bloques editables), campañas por audiencia e historial de envíos |
| `/admin/certificados` | Certificados de voluntariado: vista previa, nombre y envío |
| `/admin/encuesta` | Quién abrió la encuesta post-evento |
| `/admin/faq` | Preguntas frecuentes del sitio |
| `/admin/config` | Formularios abiertos, enlaces, salas y sellos del pasaporte |
| `/admin/users` | Cuentas de staff, roles y permisos por sección |
| `/admin/consola` | Buscar a cualquiera y **moverlo o borrarlo** (ver más abajo) |
| `/admin/reportes` | El **reporte para Credly** (ver más abajo) |
| `/admin/logs` | Registro de acciones |

## El PIN de los patrocinadores

Cada patrocinador tiene un **PIN de cuatro dígitos** (`/admin/pasaportes`,
sólo `admin`). El asistente lo teclea en su pasaporte y recibe el sello. Los
PIN se cuentan: los intentos se limitan por IP y por PIN (ver
`src/lib/pin.ts`), así que un PIN corto no se adivina a fuerza.

Ojo con el otro PIN: el del dueño del pasaporte (para poder editarlo) no es el
del patrocinador. Son dos cosas distintas, con dos contadores distintos.

Un PIN activo es también un **badge** que se puede dar escaneando el
pasaporte (`/admin/escaner/badges`). El sello se guarda en el pasaporte con su
patrocinador y la hora.

## La consola: mover y borrar

`/admin/consola` es de `admin` sólo. Busca a una persona en cualquier lista y
la mueve:

- De asistente a voluntario, de voluntario a asistente, de speaker a asistente.
- De presencial a online y al revés.

También borra por colección, con confirmación escrita: asistentes, voluntarios,
speakers o sólo pasaportes. Al borrar asistentes o voluntarios se van sus
pasaportes; al borrar speakers, la agenda queda sin ponente.

## El reporte para Credly

`/admin/reportes` baja un Excel con **todas** las personas que piden badge
digital: organizadores, voluntarios (los activos resaltados), speakers
(presenciales y virtuales) y asistentes (primero los que hicieron check-in,
al final los que tienen el correo fallido). Va en inglés, con los nombres en
MAYÚSCULAS y los correos tal cual, que es lo que pide el formato de badges.

## La encuesta post-evento

La encuesta se manda como una campaña de correo (con la variable `{encuesta}`
en la plantilla). A cada persona se le da un token y un enlace propio; el
panel **Encuesta** muestra quién lo abrió (y cuántas veces). La URL del
formulario se cambia en Configuración → Material → Encuesta final.

## Lo que el panel no hace

- No manda correos de prueba a personas reales: los correos de prueba del
  panel van a la dirección que escribas, no a las de la lista.
- No exporta datos personales sin sesión y permiso.
- No deja tocar los certificados oficiales del programa: son material de
  Amazon y no vienen en el kit.
