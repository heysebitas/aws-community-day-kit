# De una edición a la siguiente

El kit es el mismo para todos los eventos; lo que cambia es la edición. Esta
guía es el lista para cuando el evento de este año ya pasó y hay que montar
el siguiente.

## Qué se copia y qué se rehace

| Dónde | Qué | ¿Se copia? |
|---|---|---|
| `evento/config.ts` | Nombre, país, fecha, sede, tema, formato, contactos | **No**: se rehace (ver abajo) |
| `evento/equipo.ts`, `keynotes.ts`, `patrocinadores.ts`, `comunidades.ts`, `grupos.ts`, `tracks.ts` | El contenido del sitio | A mano, lo que siga valiendo |
| `evento/contacto.ts` | Correos de contacto, privacidad y patrocinios | No: los correos cambian |
| `public/evento/` | Fotos del equipo, keynotes, logos de patrocinadores y comunidades | A mano, y con el nombre nuevo |
| La base de datos | Registros, agenda, correos, FAQ, cuentas | **No**: es de la edición anterior |
| `.env.local` | Llaves y configuración del despliegue | No: se rehace (ver abajo) |

La regla del kit: lo de una edición vive en `evento/` y `public/evento/`. Copia
lo que puedas de ahí y **no toques `src/`**.

## Los pasos

1. **Una base de datos por evento.** Es lo más limpio: la edición anterior no
   se mezcla con la nueva y no hay que borrar nada. Si prefieres reusar la
   misma base, borra antes los datos de la edición anterior con la **consola**
   (`/admin/consola` → borrar asistentes, voluntarios, speakers o pasaportes;
   pide escribir la frase de confirmación).
2. **`evento/config.ts`**: nombre, siglas, edición (país o ciudad), año, país,
   ciudad, sede (dirección, coordenadas, barrio), fechas (inicio y fin),
   formato (modalidad y cupos), tema de color, idiomas y los plazos del
   Call for Speakers. `npm run setup` hace la entrevista y escribe el archivo.
3. **`evento/contacto.ts`**: correos de contacto, privacidad y patrocinios. Los
   del kit son de ejemplo: cámbialos.
4. **Fotos y logos**: copia los que quieras a `public/evento/` con nombre
   nuevo. Las carpetas `equipo/` y `keynotes/` no vienen en el repo: se crean
   cuando pones la primera foto.
5. **Tracks**: `evento/tracks.ts` es la lista que usan la portada, el
   formulario de speakers, la revisión de propuestas y la agenda. Si cambias
   el `id` de un track, se rompe lo que ya esté guardado.
6. **Enlaces del evento**: en Configuración del panel (o en el código, si
   prefieres versionarlos) están el grupo de WhatsApp, el mapa, la carpeta de
   presentaciones y la encuesta final. Son de la edición anterior: cámbialos.
7. **Correo**: el dominio del remitente (`EMAIL_FROM`), el proveedor
   (`CORREO_PROVEEDOR`) y sus llaves. Un dominio nuevo necesita verificarse
   otra vez.
8. **Captcha**: widget nuevo de Cloudflare Turnstile para el dominio nuevo, o
   el mismo si el dominio no cambia.
9. **Bucket**: si el bucket es el mismo, pon `S3_PREFIX=2027` para que los
   archivos de cada edición no se mezclen. Si es otro, cambia el bucket, la
   región, la URL pública y las credenciales.
10. **Cuentas del panel**: crea las de este equipo con `npm run crear-admin`
    (las del equipo anterior se pueden quedar, pero conviene dar de baja a
    quien ya no organiza) y quita los permisos que no apliquen.
11. **Despliegue**: `npm run doctor` sin errores, `npm run build`, y un
    registro de prueba de punta a punta (formulario → correo → pase →
    check-in).

## Lo que hay que cambiar siempre

- El **nombre** y la **edición** (país o ciudad) del evento.
- El **año** y las **fechas**: los textos del sitio los sacan de la
  configuración, pero los correos y los textos legales los copian.
- El **dominio** y el remitente de correo.
- La **sede** y sus coordenadas (el globo de la portada).
- Los **datos de contacto** y la política de privacidad.
- Las **llaves**: `JWT_SECRET` nueva por despliegue
  (`openssl rand -base64 48`), y las del captcha, el bucket y el correo si
  cambian de servicio.

## Copia de seguridad

Antes de que el evento empiece, y cada cierto tiempo:

| Qué | Cómo |
|---|---|
| La base de datos | Copia de Atlas (plan gratis: una base y una copia por semana) o `mongodump` contra tu servidor; en DocumentDB, las copias automáticas |
| El bucket | Versioning activado, o copia con `aws s3 sync` a otro bucket |
| El `.env.local` | En un gestor de contraseñas, nunca en el repo |
| La configuración | `evento/` está en el repositorio: eso ya es la copia |

Dos pruebas que hay que hacer **antes** de que importe:

1. **Restaurar** una copia en una base de prueba y comprobar que abre y que el
   panel entra.
2. **Descargar** una copia de verdad (no sólo la configuración del servicio) y
   guardarla cifrada, con la fecha y la edición en el nombre.

La base en memoria del modo demo (`npm run demo`) **no** sirve como copia: se
borra al apagar.

## Después del evento: anonimizar y borrar

El evento junta documentos, teléfonos y correos de cientos de personas. Pasado
el evento, esos datos ya no hacen falta y la ley de tu país (ver
[docs/paises.md](paises.md)) dice cuánto tiempo puedes guardarlos.

Qué hay que hacer, por orden:

1. **Decide el plazo.** El que dice tu política de privacidad y la ley local.
   Anótalo en un sitio visible (README del repositorio, una nota del
   equipo).
2. **Exporta lo que sí quieras conservar** (números del evento, conteos de
   check-in, premiación) **antes** de borrar: en la consola, en Reportes →
   base para Credly, o en los reportes del panel.
3. **Anonimiza lo que puedas conservar.** En vez de borrar el registro entero,
   vacía lo que identifica: nombre, correo, documento, teléfono, redes del
   pasaporte. Así los conteos siguen sirviendo y la lista no identifica a
   nadie. Esto no hay un botón que lo haga: se hace sobre la base de datos.
4. **Borra lo que no.** Con la consola: asistentes, voluntarios, speakers y
   pasaportes. Ojo: es un borrado masivo, sin vuelta atrás, y pide escribir
   una frase de confirmación.
5. **Limpia lo que se te olvida:** los **registros de acciones** (`/admin/logs`)
   guardan nombres de usuarios; los **correos enviados** (`EmailEnvio`) guardan
   direcciones; los **exportes** que bajaste están en el computador de quien
   los bajó; los **tokens** de contraseña y de edición de pasaporte caducan
   solos, pero se pueden borrar antes.
6. **Da de baja las cuentas** del panel y **rota `JWT_SECRET`**.
7. **Avisa** a quien pregunte por sus datos: el procedimiento de supresión
   tiene que existir y alguien tiene que saber ejecutarlo.

Un borrado con la consola queda anotado en el registro de acciones: es la
prueba de que se hizo.
