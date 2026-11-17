# El bucket

El kit sube al bucket las fotos de los speakers, los logos, las diapositivas y
los PDF de las escarapelas. Cada edición tiene el suyo: Amazon S3 detrás de
CloudFront, Cloudflare R2, o un Garage local para probar.

La configuración del bucket (lectura pública, CORS, credenciales) está en
[despliegue.md](despliegue.md#el-bucket). Aquí va lo que el bucket tiene que
servir: las cabeceras.

## La cabecera de cada objeto

Sin `Cache-Control` el navegador no sabe cuánto puede guardar una foto y la
vuelve a pedir en cada visita; con CDN delante, el origen recibe una petición
por cada visita también.

| Qué | `Cache-Control` |
|---|---|
| Fotos, logos, diapositivas y PDF (`cfs/photos/`, `speakers/`, `agenda/`, `sponsors/`, `emails/`, `pdfs/`, `templates/`) | `public, max-age=31536000, immutable` |
| Tarjetas de los speakers (`speaker-cards/`) | `public, max-age=86400, stale-while-revalidate=604800` |

La diferencia es el nombre del archivo. Casi todo se sube con un UUID en la
key, así que esa URL nunca cambia de contenido y puede ser inmutable durante un
año. Las tarjetas de los speakers se redibujan con el mismo nombre: pueden
cambiar, así que no pueden ser inmutables.

En CloudFront, el comportamiento de caché tiene que **dejar pasar la cabecera
del origen** (`Cache-Control` en *Cache policy* o en *Origin request policy*),
o el TTL del CDN manda por encima de lo que diga el bucket. En R2 lo que cuenta
es la cabecera del objeto y la regla del bucket.

## Lo que ya está subido

Lo que se subió antes de que existiera esta regla no trae ninguna cabecera.
El script la pone:

```bash
node scripts/cache-control-bucket.mjs           # en seco: sólo lista lo que cambiaría
node scripts/cache-control-bucket.mjs --aplicar # lo aplica
```

Lee las mismas variables que `src/lib/s3.ts` (`AWS_REGION`, `AWS_S3_BUCKET`,
`S3_ENDPOINT`, `S3_PREFIX`) y el `.env.local`. No borra nada ni cambia el
contenido de los archivos: cada objeto se copia sobre sí mismo (`CopyObject` con
`MetadataDirective: REPLACE`), que es la única forma de cambiar los metadatos
sin volver a subir el archivo. El tipo de contenido se conserva.

Las credenciales necesitan `s3:ListBucket`, `s3:GetObject` y `s3:PutObject` en
ese bucket. El script se puede repetir: los objetos que ya llevan la cabecera
no se tocan.

Para probarlo sin tocar el bucket de nadie, apúntalo a un Garage local:

```bash
S3_ENDPOINT=http://127.0.0.1:3900 AWS_S3_BUCKET=pruebas \
AWS_ACCESS_KEY_ID=admin AWS_SECRET_ACCESS_KEY=admin node scripts/cache-control-bucket.mjs
```

`npm run doctor` avisa si falta lo que el script necesita y, si hay
credenciales, si algún objeto se quedó sin la cabecera.

## `AWS_S3_PUBLIC_URL` va en el build

Es la URL pública del bucket (con CloudFront delante, la del CDN). Se usa para
las fotos de los speakers, los QR de las escarapelas y los enlaces de los
correos.

`next.config.ts` la lee **al compilar** para dejar pasar las fotos por el
optimizador de imágenes (`remotePatterns`). Si no está definida en el build, las
fotos del bucket no se optimizan: se sirven tal cual, sin AVIF ni WebP, y sin
el caché que el optimizador añade. Hay que tenerla antes de `npm run build`, no
sólo antes de `npm start`.

## Lo que el kit no hace

El kit no toca la configuración del bucket ni la del CDN: eso es de la edición.
Lo que hace es decir qué cabeceras tienen que servir y dejar un script para
corregir lo que ya estaba subido.
