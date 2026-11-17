# Seguridad

Un evento junta nombres, documentos, correos y teléfonos de cientos de
personas. Esto es lo que el kit hace por ti y lo que te toca a ti.

Para **reportar** una vulnerabilidad: [SECURITY.md](../SECURITY.md).

## Lo que hace el kit

**Entorno**
- En producción no arranca si falta `MONGODB_URI`, `JWT_SECRET` (32+
  caracteres) o `TURNSTILE_SECRET_KEY`. Prefiere no levantar a levantar abierto.
- El modo demo sólo se activa con `MODO_DEMO=1`, nunca solo.

**Sesiones y cuentas**
- Contraseñas con bcrypt; sesión en una cookie `HttpOnly`, `SameSite`, firmada
  con HS256 y con el algoritmo fijo.
- Una sesión por cuenta: entrar en otro dispositivo cierra la anterior.
- Las cuentas nuevas eligen su contraseña con un enlace de un solo uso.
- Roles (`admin`, `organizer`, `volunteer`…) y permisos por sección; cada ruta
  de la API comprueba el suyo, no confía en que el menú la esconda.
- Lo que se hace en el panel queda en un registro de acciones.

**Formularios públicos**
- Captcha (Cloudflare Turnstile) verificado en el servidor, que **falla
  cerrado**: si no se puede comprobar, se rechaza.
- Límite de intentos en los PIN.
- Validación y normalización en el servidor de cada campo; los enlaces de
  redes sólo aceptan los dominios que les corresponden.

**Límite de peticiones**
- El límite se aplica dentro del handler de cada ruta, no de forma global en
  el proxy. La clave combina la operación (y, cuando hace falta, el recurso)
  con la IP. Las rutas que cortan la petición responden `429` e incluyen
  `Retry-After`.
- Las rutas públicas con límite son:

| Ruta | Método | Límite por IP |
|---|---|---|
| `/api/registrations` | `POST` público | 50 cada 15 minutos |
| `/api/volunteers` | `POST` público | 30 cada 15 minutos |
| `/api/speakers` | `POST` | 8 cada 60 minutos |
| `/api/upload/public-presign` | `POST` | 12 cada 10 minutos |
| `/api/auth/login` | `POST` | 10 cada 15 minutos |
| `/api/auth/create-password` y `/api/auth/validate-token` | `POST` y `GET` | 20 cada 15 minutos, en total |
| `/api/passport/[shortId]/stats` | `POST` | 50 visitas al día; 50 clics por red y hora (sólo evita sobrecontar, no corta la petición) |
| `/api/confirm/[token]` | `GET` y `POST` | 100 cada 15 minutos, en total |
| `/api/confirm-passport-edit/[token]` | `POST` | 30 cada 15 minutos |
| `/api/passes/[qrCode]` | `GET` | 30 cada 10 minutos |
| `/api/speaker-profiles/check-slug` | `GET` | 120 cada 15 minutos |
| `/api/marca/[pieza]` | `GET` | 300 cada 10 minutos |
| `/api/og/speaker/[slug]` | `GET` | 120 cada 10 minutos |

Los límites van por IP y son holgados a propósito: en un campus o en la sede mucha gente sale por la misma
IP, y las imágenes de marca se piden en cada visita y desde los proxies de los correos.

- `POST /api/webhooks/resend` queda fuera de este límite: cada evento se
  autentica con la firma de Svix y el proveedor reintenta entregas válidas;
  un límite genérico por IP podría rechazar esos reintentos. Una firma
  inválida se rechaza con `401` antes de tocar la base de datos.

**Archivos**
- Las subidas van directo al bucket con una URL firmada que fija tipo y
  tamaño; sólo se aceptan los formatos esperados.
- Una URL de foto sólo se acepta si apunta a tu bucket.
- Cuando el servidor descarga una imagen (tarjetas de speaker) no sigue
  direcciones internas ni redirecciones hacia ellas.

**Navegador**
- Cabeceras de seguridad y política de contenido (CSP) en `next.config.ts`:
  nadie puede enmarcar el sitio ni cargar scripts de otro origen.
- Los correos de contacto no van escritos en el HTML.

**Privacidad**
- Los avatares generados usan un identificador derivado, no el correo.
- `robots.txt` deja fuera el panel, la API y las páginas personales (pases, pasaportes).
- Los exportes con datos personales exigen sesión y permiso.

## Lo que te toca a ti

- **Secretos**: `.env.local` nunca va al repo. `JWT_SECRET` única por
  despliegue (`openssl rand -base64 48`). Rota las llaves si alguien deja el equipo.
- **La IP real detrás de un proxy.** El límite de peticiones necesita saber
  quién llama. Por omisión toma la última dirección de `X-Forwarded-For`, que
  es la que añade tu proxy. Con más saltos (CDN + nginx), `PROXIES_DE_CONFIANZA=2`.
  Con Cloudflare, `CABECERA_IP=cf-connecting-ip`. Si lo dejas mal, o todos
  comparten un límite o cualquiera se lo salta.
- **Base de datos**: usuario con permisos sólo sobre su base, acceso
  restringido por red, copias de seguridad cifradas.
- **Bucket**: credenciales con acceso sólo a ese bucket; CORS sólo para tu dominio.
- **Cuentas del panel**: el mínimo permiso que cada persona necesita, y dar de
  baja las cuentas al terminar el evento.
- **Datos personales**: pide sólo lo que vas a usar, revisa los textos legales
  con alguien que conozca la ley de tu país, y borra o anonimiza los datos
  cuando el evento ya no los necesite.
- **Dependencias**: Dependabot viene configurado; no dejes sus PR sin mirar.

## Límites conocidos

- El límite de peticiones vive en la memoria del proceso: se reinicia con el
  servidor y no se comparte entre instancias: despliega una sola instancia.
  Los dos mapas tienen un tope de 10 000 claves; al llenarse se descartan las
  más antiguas.
- La CSP permite scripts en línea (`'unsafe-inline'`): es lo que deja
  prerenderizar las páginas sin un nonce por petición. Medidas y decisión
  pendiente en [csp.md](csp.md).
- El código del pasaporte es el mismo que el del QR del pase: quien ve el QR
  de alguien puede abrir su pasaporte. Editarlo sí pide el PIN.
- No hay segundo factor para el panel.

Si alguno te importa para tu evento, está en el [ROADMAP](../ROADMAP.md) y un
PR es bienvenido.
