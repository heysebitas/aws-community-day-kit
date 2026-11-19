# Despliegue

El kit es una aplicación de Next.js que corre con Node 20.19 o más: sirve en
cualquier lugar donde puedas ejecutar `npm run build` y `npm start`. Necesita
tres cosas por fuera: una base ([base-de-datos.md](base-de-datos.md)), un
proveedor de correo ([correo.md](correo.md)) y un bucket para archivos.

## Antes

1. `npm run doctor` sin errores.
2. `.env.local` completo en el servidor (parte de `.env.example`). Las
   variables `NEXT_PUBLIC_*` quedan escritas en el build: tienen que estar
   **antes** de `npm run build`.
3. La primera cuenta: `npm run crear-admin`.

## Servidor propio (EC2, Lightsail, cualquier VPS)

Así corren las ediciones de Colombia y Chile. En `deploy/` hay ejemplos para
copiar y ajustar:

| Archivo | Para qué |
|---|---|
| `deploy/pm2/ecosystem.config.cjs` | Mantener el proceso vivo con pm2 |
| `deploy/nginx/sitio.conf` | Proxy inverso con TLS y límite de subida |
| `deploy/github/desplegar.yml` | Despliegue por SSH en cada push a `main` |

```bash
git clone <tu-fork> /srv/mi-evento && cd /srv/mi-evento
npm ci --include=dev
npm run build
pm2 start deploy/pm2/ecosystem.config.cjs && pm2 save
```

Detrás de nginx o de un CDN, dile al kit de dónde sale la IP real del
visitante (ver [seguridad.md](seguridad.md)): de eso depende el límite de peticiones.

### En un VPS de 1 GB, con Mongo en la misma máquina

- **Node.** `ecosystem.config.cjs` ya pone `--max-old-space-size=256` y
  `MALLOC_ARENA_MAX=2`: el heap no pasa de unos 170 MB con carga, y sin tope de
  arenas la memoria nativa de glibc crecía hasta 800 MB y no se devolvía.
  `max_memory_restart` queda por encima del pico medido para que pm2 no reinicie
  a mitad del evento (cifras en [rendimiento.md](rendimiento.md#servidor)).
- **mongod.** Por omisión la caché de WiredTiger es la mitad de la RAM menos 1 GB
  (256 MB como mínimo) y no deja sitio a Node. En `/etc/mongod.conf`:

  ```yaml
  storage:
    wiredTiger:
      engineConfig:
        cacheSizeGB: 0.25
  ```

  `compose.yaml` hace lo mismo con `--wiredTigerCacheSizeGB 0.25`.
- **Swap.** 1 GB de swap evita que un pico mate a mongod o a Node.
- **nginx.** `deploy/nginx/sitio.conf` mantiene conexiones abiertas con Node
  (`upstream` con `keepalive`), cachea `/_next/static`, `/_next/image`, las
  páginas con ISR y la API pública según la `Cache-Control` que manda Node, y
  nunca lo que lleva la cookie de sesión, `/api/admin`, `/api/auth` ni el panel.
  Las imágenes de los correos y las páginas ya cacheadas no llegan a Node.
- **Compresión.** Node comprime con gzip y nginx no vuelve a comprimir lo que
  llega comprimido, así que sirve tal cual. Si prefieres que comprima sólo nginx
  (p. ej. para usar brotli, que necesita el módulo `ngx_brotli`), construye y
  arranca con `COMPRIMIR_EN_PROXY=1`. Sin nginx delante (Docker solo) déjala sin
  poner: si no, el sitio sale sin comprimir.
- **HOSTNAME.** Next puede escuchar en `127.0.0.1` (lo natural detrás de nginx),
  en `0.0.0.0` o en `localhost`.

## Docker

```bash
docker compose up --build
```

`compose.yaml` levanta el sitio y un MongoDB. Sirve para un servidor único o
para probar en local; en producción usa una base administrada y quita ese
servicio.

- **Construir:** `docker build -t aws-community-day-kit --build-arg NEXT_PUBLIC_APP_URL=https://tu-dominio .`
  Las `NEXT_PUBLIC_*` quedan escritas en el build, por eso son argumentos.
- **Certificado de un SCD:** `recursos/` no entra en la imagen, a propósito. Si
  usas la plantilla oficial, móntala: `-v ./recursos:/app/recursos:ro` (en
  `compose.yaml` está comentado). Sin ella sale el certificado genérico.
- **Imagen:** el build de Docker activa `output: "standalone"` (`NEXT_STANDALONE=1`); la imagen final sólo
  lleva `.next/standalone`, `.next/static` y `public`, corre sin root y arranca con `node server.js`.
- **Memoria:** la imagen pone `NODE_OPTIONS=--max-old-space-size=256`. Con 1 GB en la
  máquina, limita el contenedor (`--memory=600m` o `mem_limit` en compose) y la caché
  de Mongo (ver arriba).
- **Variables:** el resto (`MONGODB_URI`, `JWT_SECRET`…) se pasan al arrancar:
  `docker run --env-file .env.local -p 3000:3000 aws-community-day-kit`.
- **Salud:** `GET /api/health` responde 200 si el proceso vive; con `?db=1`
  hace un `ping` a Mongo y responde 503 si no hay conexión. El `HEALTHCHECK` de la
  imagen usa la primera forma (que Mongo caiga no debe reiniciar el sitio); un
  monitor externo puede usar `?db=1`. No devuelve datos y no se cachea.

No está probado en un evento real: haz un ensayo completo antes.

## Plataformas (Vercel, Amplify, Render, Railway…)

Funcionan si ejecutan Next.js 16 con servidor de Node. Dos cosas a tener en cuenta:

- **El límite de peticiones vive en memoria.** Con varias instancias o
  funciones sin estado, cada una lleva su propia cuenta. Para un evento va
  bien en una sola instancia; si escalas, pon el límite en el borde (WAF, CDN).
- **Los PDF y las imágenes se generan en el servidor.** Necesitan Node, no un
  runtime de borde.

## El bucket

Amazon S3 o cualquier servicio compatible (Cloudflare R2, MinIO) con `S3_ENDPOINT`.

- Lectura pública de los objetos (o un CDN delante) y esa URL en `AWS_S3_PUBLIC_URL`.
- CORS que permita `PUT` desde tu dominio: las subidas van directo del
  navegador al bucket con una URL firmada.
- Unas credenciales que sólo puedan leer y escribir en ese bucket.

```json
[{ "AllowedOrigins": ["https://tu-dominio.com"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3000 }]
```

`AWS_S3_PUBLIC_URL` tiene que estar definida **antes del build**: `next.config.ts`
la lee al compilar y sin ella las fotos del bucket no pasan por el optimizador de
imágenes. Las cabeceras que tiene que servir el bucket y cómo corregir lo que ya
estaba subido están en [bucket.md](bucket.md).

## Captcha

Crea un widget en [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
para tu dominio y pon las dos llaves. En producción, sin la llave secreta los
formularios públicos rechazan todo: es a propósito.

## Después

- Envíate un registro de prueba de punta a punta: formulario → correo → pase → check-in.
- Activa las copias de seguridad de la base.
- Dos semanas antes del evento, haz un ensayo del check-in con el equipo y los
  teléfonos que se van a usar ese día.

## Navegadores soportados

Chrome y Edge 111, Firefox 128 y Safari 16.4 en adelante (`browserslist` de `package.json`). Son los mínimos con los que Tailwind 4 genera el CSS (`@layer`, `color-mix`): por debajo el sitio sale sin estilos aunque el JS funcione. Con estos mínimos se pueden usar `<dialog>`, `inert`, `svh`/`dvh`, `color-mix` y `oklch` sin respaldo; `:has()`, `scrollbar-color` y `popover` todavía no entran y solo van como mejora progresiva.

## Que la imagen no lleve datos de ejemplo

El `Dockerfile` compila con `MODO_DEMO=1 BUILD_SIN_SEMILLA=1`: la base en memoria del build
arranca vacía, así que el HTML prerenderizado no trae nombres de la demo. Para comprobarlo
(con `.next/cache` limpio, que puede guardar datos de un build anterior):

```bash
BUILD_SIN_SEMILLA=1 MODO_DEMO=1 JWT_SECRET=x npm run build && node scripts/comprobar-sin-semilla.mjs
```
