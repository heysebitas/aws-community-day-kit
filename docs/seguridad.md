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
- Límite de peticiones por IP en todo lo público, y de intentos en los PIN.
- Validación y normalización en el servidor de cada campo; los enlaces de
  redes sólo aceptan los dominios que les corresponden.

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
  servidor y no se comparte entre instancias.
- La CSP permite scripts en línea (`'unsafe-inline'`): es lo que deja
  prerenderizar las páginas sin un nonce por petición.
- El código del pasaporte es el mismo que el del QR del pase: quien ve el QR
  de alguien puede abrir su pasaporte. Editarlo sí pide el PIN.
- No hay segundo factor para el panel.

Si alguno te importa para tu evento, está en el [ROADMAP](../ROADMAP.md) y un
PR es bienvenido.
