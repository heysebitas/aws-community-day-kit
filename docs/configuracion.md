# Configuración

Todo está en `evento/config.ts`. `npm run setup` lo escribe por ti; esto es
para cuando quieras tocarlo a mano. Los tipos, con un comentario por campo,
están en `src/config/tipos.ts`, y `npm run doctor` te dice si algo quedó mal.

## Identidad

| Campo | Qué es |
|---|---|
| `tipo` | `"scd"` si es un AWS Student Community Day, `"cd"` si es otro Community Day |
| `nombre`, `siglas` | «AWS Student Community Day», «SCD» |
| `edicion` | Lo que va después del nombre: el país o la ciudad |
| `anio`, `pais`, `ciudad` | `pais` es un código de [docs/paises.md](paises.md) |
| `organiza` | Quién firma los correos, las cartas y los textos legales |
| `sitio` | La URL pública, sin barra final |
| `marca` | El logo del encabezado (`logo` en SVG, `logoPng` para los PDF) y las líneas de texto que lo acompañan |

## Certificado de voluntariado

Depende de `tipo`:

- **`"scd"`**: el certificado oficial de los AWS Student Community Days. La
  plantilla no viene en el kit porque es material de Amazon: pídesela a tu
  contacto del programa y guárdala como `recursos/certificado-sbg.pdf`. El kit
  escribe sobre ella el nombre de la persona, quién organiza, el evento, la
  fecha y la ciudad. Va en inglés, como la plantilla.
- **`"cd"`**: un certificado genérico, dibujado con el tema de tu edición, que
  firma quien pongas en `detalles.certificado` (`{ nombre, cargo }`); sin eso,
  el equipo organizador.

Se envían desde **Panel → Certificados**, con una prueba a tu correo antes.
Mientras falte la plantilla, un SCD emite el genérico; `npm run doctor` lo
avisa. Manda una prueba antes del envío real para ver cuál sale.

## Fecha y sede

Las horas se escriben **en hora local** (`"2027-10-23T08:30"`); la zona sale
del país. Con `fecha.confirmada: false` el sitio dice «por confirmar».

`sede.coordenadas` mueve el marcador del globo de la portada. Sin coordenadas,
señala la capital. `sede.silueta` dibuja el horizonte de la ciudad detrás de la
sede: `"auto"` lo genera, `"ninguna"` lo quita.

## Formato

- `cupos` y `modalidad` (`presencial`, `online`).
- `tema`: ver [docs/temas.md](temas.md).
- `idiomas`: `["es", "en"]`. El primero es el principal y va sin prefijo en la URL.
- `marca.mascota` (opcional): la ilustración de tu edición, un PNG con fondo
  transparente en `public/evento/`. Sale en la portada, el pasaporte y las
  tarjetas de speaker; sin ella, esos huecos no se dibujan.
- `rastreoIA`: si `robots.txt` deja pasar a los rastreadores de IA y se publican
  `/llms.txt` y `/llms-full.txt`.

## Call for Speakers

`cfp.cierre` y `cfp.slides` son fechas límite que el formulario hace cumplir.
`cfp.online` abre la opción de charla remota. `cfp.hitos` son los textos de las
etapas intermedias, tal como se muestran.

## Detalles

`detalles` reúne lo que aparece en preguntas frecuentes y correos: cómo llegar,
cuántos speakers se esperan, consejos de viaje para la carta de invitación
internacional, quién firma el certificado de voluntariado, la encuesta final.

`detalles.legalActualizado` es la fecha que muestran los textos legales.

## Los textos legales son una plantilla

Privacidad y términos se arman con los datos de tu país (ley, autoridad) y de
tu evento. Son un buen punto de partida, **no asesoría legal**: léelos enteros
y pásalos por alguien que conozca la norma local antes de recibir datos reales.

## Cambiar un texto del sitio

Los textos están en `src/messages/es.json` y `en.json`. Los datos de la edición
no se escriben: se usan como `[[ciudad]]`, `[[fecha]]`, `[[sede]]`… (la lista
completa en `src/i18n/tokens.ts`). Si cambias una clave, cámbiala en los dos.

## Lo que se edita desde el panel

Sin tocar código, en **Configuración del evento**: abrir y cerrar formularios,
enlaces de los correos (grupos de WhatsApp, mapa, encuesta), salas y sellos del
pasaporte. La agenda, los speakers y las preguntas frecuentes también viven en
la base y se gestionan desde el panel.

## Variables de entorno

Todo lo que el kit lee del entorno está en `.env.example`. Esta es la lista
completa, con lo que hace cada una y si hace falta:

| Variable | Qué hace | ¿Hace falta? |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | La URL pública: sale en los enlaces de los correos y en los QR | Recomendada; si no, se usa el sitio de la configuración |
| `NEXT_PUBLIC_BASE_PATH` | Prefijo para servir el sitio bajo un subdirectorio (con barra inicial y sin barra final) | No |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | La llave del captcha, para poder dibujarlo | Sí, en producción: sin ella no hay captcha |
| `MONGODB_URI` | La conexión a la base | Sí (salvo en modo demo) |
| `MONGODB_CA_FILE` | El certificado propio de la base (Amazon DocumentDB) | No |
| `MONGODB_POOL` | Conexiones máximas del pool (10) | No |
| `MONGODB_TIMEOUT_MS` | Milisegundos que se espera a que la base responda (5000) | No |
| `HTTP_TIMEOUT_MS` | Milisegundos máximos de las llamadas al correo y al captcha (10000) | No |
| `JWT_SECRET` | Firma de las sesiones; 32 caracteres o más, distinta en cada despliegue | Sí |
| `TURNSTILE_SECRET_KEY` | Verifica el captcha en el servidor | Sí, en producción |
| `CORREO_PROVEEDOR` | `resend`, `ses` o `consola` (si no se dice, es Resend cuando hay llave, y si no, consola) | No |
| `RESEND_API_KEY` | La llave de Resend | Si usas Resend |
| `RESEND_WEBHOOK_SECRET` | Verifica el webhook: sin él no se registran entregas ni rebotes | Si usas Resend y quieres el seguimiento |
| `SES_REGION` | La región de Amazon SES (si no, la de `AWS_REGION`) | No |
| `SES_CONFIGURATION_SET` | El conjunto de configuración de SES | No |
| `EMAIL_FROM` | El remitente (por omisión, el nombre del evento en `noreply@` del dominio) | No |
| `MARKETING_EMAIL_FROM` | El remitente de las campañas masivas (si no, el de `EMAIL_FROM`) | No |
| `AWS_REGION` | La región del bucket (`us-east-1`) | No |
| `AWS_S3_BUCKET` | El bucket de los archivos | Sí, para subir fotos o diapositivas |
| `AWS_S3_PUBLIC_URL` | La URL pública del bucket; tiene que existir **antes del build** | Sí, para servir las fotos |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Las credenciales del bucket (las lee el SDK de AWS) | Sí, para subir |
| `S3_ENDPOINT` | Un servicio compatible: Cloudflare R2, MinIO, Garage | No |
| `S3_PREFIX` | La carpeta dentro del bucket, si se comparte entre ediciones | No |
| `GOOGLE_MAPS_KEY` | El mapa de la sede en los correos | No |
| `PROXIES_DE_CONFIANZA` | Cuántos proxies propios hay delante (1) | No |
| `CABECERA_IP` | La cabecera con la IP real, si tu CDN usa otra (`cf-connecting-ip`) | No |
| `MODO_DEMO` | Base en memoria, correos a la consola y captcha apagado | No |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | La primera cuenta, para `npm run crear-admin` | No |
| `PORT` | El puerto del servidor de desarrollo y de la demo (3000) | No |
| `DB_MEMORIA_PUERTO` | El puerto del MongoDB en memoria de `npm run db:memoria` (27027) | No |
| `CHROME` | La ruta al Chrome, para `node scripts/captura.mjs` | No |
| `PRUEBA_URL` | La dirección de un sitio ya levantado, para las pruebas que miran el HTML servido | No |
| `GUARDAR_PDF` | La carpeta donde las pruebas guardan los PDF que generan | No |

`NODE_ENV` y `NEXT_RUNTIME` los pone Next.js: no se tocan. `NEXT_PUBLIC_BUCKET_HOST`
tampoco se define: `next.config.ts` la calcula a partir de `AWS_S3_PUBLIC_URL`
y la usa el optimizador de imágenes.

En producción el servidor **no arranca** si falta `MONGODB_URI`, `JWT_SECRET`
o `TURNSTILE_SECRET_KEY`: prefiere no levantar a levantar abierto. Lo que
falla, cómo se ve y qué hacer está en [troubleshooting.md](troubleshooting.md).
