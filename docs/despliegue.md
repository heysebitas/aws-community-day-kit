# Despliegue

El kit es una aplicación de Next.js que corre con Node 20.12 o más: sirve en
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

## Docker

```bash
docker compose up --build
```

`compose.yaml` levanta el sitio y un MongoDB. Sirve para un servidor único o
para probar en local; en producción usa una base administrada y quita ese
servicio.

- **Construir:** `docker build -t community-day-kit --build-arg NEXT_PUBLIC_APP_URL=https://tu-dominio .`
  Las `NEXT_PUBLIC_*` quedan escritas en el build, por eso son argumentos.
- **Imagen:** `next.config.ts` usa `output: "standalone"`; la imagen final sólo
  lleva `.next/standalone`, `.next/static` y `public`, corre sin root y arranca con `node server.js`.
- **Variables:** el resto (`MONGODB_URI`, `JWT_SECRET`…) se pasan al arrancar:
  `docker run --env-file .env.local -p 3000:3000 community-day-kit`.
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
