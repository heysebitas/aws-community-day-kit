# Cuando algo falla

Los fallos que más se repiten al montar una edición, y qué hacer con cada uno.

## La instalación o la demo no arrancan

- **Node:** hace falta 20.19 o más (`node --version`). Con una versión menor
  Tailwind falla al compilar con un error de `require()` de un módulo ES.
- **La primera vez, la demo descarga MongoDB** (unos 100 MB) para la base en
  memoria. Sin internet, o detrás de un proxy que lo bloquee, se queda
  esperando. Compruébalo aparte con `npm run db:memoria`.
- **Puerto ocupado:** `PORT=3001 npm run demo`.
- **Páginas lentas en la demo:** el modo desarrollo compila cada página la
  primera vez que se abre. `npm run demo -- --produccion` compila todo al
  principio y después responde al instante.
- **«Demasiados intentos» al entrar al panel:** el login admite 10 intentos
  cada 15 minutos por IP, también en la demo. Espera o reinicia la demo.

## El captcha no aparece o los formularios rechazan todo

**Síntoma:** el formulario público no deja enviar, o el navegador dice que hay
un error de captcha.

- El widget se dibuja sólo si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` está definida.
  Es una `NEXT_PUBLIC_*`: **queda escrita en el build**. Si la cambias, hay que
  volver a compilar (`npm run build`) o reiniciar el servidor de desarrollo.
- El widget de Cloudflare Turnstile tiene que tener tu dominio entre los
  hostnames permitidos. En local, `localhost`.
- Con `TURNSTILE_SECRET_KEY` definida pero sin site key, el formulario no
  manda token y el servidor lo rechaza: **falla cerrado**, a propósito.
- Sin `TURNSTILE_SECRET_KEY`, en desarrollo el captcha se acepta siempre; en
  producción se rechaza todo. Es el comportamiento que evita un despliegue
  abierto a bots.
- Para probar sin captcha: `npm run demo` (levanta el kit con
  `MODO_DEMO=1`, sin base de datos ni llaves).

## La subida al bucket falla

**Síntoma:** en la consola del navegador, `Access to fetch ... has been blocked
by CORS policy`, o la imagen no aparece.

- Las subidas van **del navegador al bucket**, con una URL firmada que vale
  cinco minutos. El bucket tiene que permitir `PUT` desde tu dominio:
  `AllowedOrigins: ["https://tu-dominio.com"]`, `AllowedMethods: ["PUT","GET"]`.
- Comprueba que `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_S3_PUBLIC_URL` y las
  credenciales son las de ese bucket, y que las credenciales tienen permiso
  sobre él.
- Con un servicio compatible (R2, MinIO, Garage) hay que poner `S3_ENDPOINT`.
- La URL pública (`AWS_S3_PUBLIC_URL`) tiene que estar definida **antes del
  build**: `next.config.ts` la lee al compilar. Sin ella, las fotos del bucket
  no pasan por el optimizador de imágenes.
- Las cabeceras que debe servir el bucket están en
  [bucket.md](bucket.md).

## El límite de peticiones no distingue a nadie

**Síntoma:** todo el mundo recibe un `429` a la vez, o el límite no se aplica
a nadie.

- Por omisión se toma la última dirección de `X-Forwarded-For`. Con un CDN
  delante, pon `PROXIES_DE_CONFIANZA=2`; con Cloudflare,
  `CABECERA_IP=cf-connecting-ip`.
- El contador vive **en la memoria del proceso**: se reinicia con el servidor
  y no se comparte entre instancias. Con varias instancias, pon el límite en
  el borde (WAF, CDN).

## El panel no deja entrar

- **Unauthorized**: no hay cookie de sesión. Entra en `/admin/login`.
- **Forbidden**: tu rol no llega a esa sección, o tu nivel es `ver` donde hace
  falta `editar`. Mira [panel.md](panel.md).
- Si entras en otro dispositivo, se cierra la sesión anterior: **una sesión
  por cuenta**.
- `JWT_SECRET` tiene que tener 32 caracteres o más y ser **la misma en todas
  las instancias**. Si cambia, se caen todas las sesiones.
- En desarrollo, si el navegador guarda cookies viejas, borra las cookies del
  sitio.

## La base de datos no conecta

- `MONGODB_URI no está definida`: copia `.env.example` a `.env.local`, o corre
  `npm run demo` (que usa una base en memoria).
- `serverSelectionTimeoutMS` son 5000 ms por omisión
  (`MONGODB_TIMEOUT_MS`): si tu base tarda más, súbelo.
- Amazon DocumentDB: `retryWrites` se apaga solo, pero el certificado de
  Amazon hay que pasarlo (`MONGODB_CA_FILE=/ruta/global-bundle.pem`).
- El kit no migra: los índices los crea Mongoose solo, al usar cada modelo por
  primera vez (la primera vez contra una base grande tarda). Si hay correos
  repetidos, el índice único no se puede crear: `npm run doctor` los cuenta.

## El build falla por una variable `NEXT_PUBLIC_*`

Las `NEXT_PUBLIC_*` se escriben **en el build**: tienen que existir antes de
`npm run build`, no después. Si cambias el dominio o la llave del captcha,
vuelve a compilar.

## Los correos no salen

- Sin proveedor (`CORREO_PROVEEDOR`) ni `RESEND_API_KEY`, los correos **se
  escriben en la consola** y no salen: es el modo de prueba.
- Con `CORREO_PROVEEDOR=ses` se usan las credenciales de AWS y la región
  `SES_REGION` (por omisión, `AWS_REGION`).
- El dominio del remitente tiene que estar **verificado** en el proveedor.
- `RESEND_WEBHOOK_SECRET` es lo que registra entregas y rebotes; sin él, el
  panel no sabe qué pasó con cada correo.
- Un envío grande se manda por tramos: si se corta a la mitad, lo que ya
  salió queda anotado.

## El sitio sale sin estilos

Chrome y Edge 111, Firefox 128 y Safari 16.4 o superior. Por debajo de eso
Tailwind 4 no genera el CSS y el sitio sale en blanco. Se puede ver en
`browserslist`, en `package.json`.

## Las fotos del bucket no se ven

- `AWS_S3_PUBLIC_URL` antes del build (arriba).
- El bucket tiene que permitir lectura pública, o tener un CDN delante.
- Con `next/image`, los hostnames permitidos se calculan al compilar: si
  cambias la URL del bucket, recompila.

## La foto de un speaker o un logo no se sube

- El panel manda la foto al bucket; si la subida falla, mira la consola del
  navegador (CORS o credenciales).
- Los formatos que se aceptan están en `src/lib/subidas.ts`; los que se
  rechazan avisan con el motivo.
