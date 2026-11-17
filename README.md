# AWS Community Day Kit

El sitio, los formularios y el panel de operación de un **AWS Student
Community Day** o de cualquier **Community Day**, listos para que cualquier
comunidad de Latinoamérica monte el suyo. Es la plataforma con la que se
hicieron los Student Community Days de [Colombia](https://awsstudentcommunity.day),
[Chile](https://scdchile.cl) y [México](https://studentcommunitydaymexico.com/),
y aquí está sin nada de ninguno de los tres: tu evento se describe en una
carpeta y el resto se adapta.

[English](README.en.md)

![Los ocho temas de color](docs/img/temas.png)

## Qué trae

- **Sitio público** en español e inglés: portada con un globo que señala tu
  sede, agenda, speakers, patrocinadores, preguntas frecuentes, textos legales.
- **Formularios** de registro, Call for Speakers y voluntarios, con los
  documentos, teléfonos y niveles de estudio de 20 países.
- **Panel** con roles y permisos: revisión de propuestas, agenda con detección
  de choques, check-in con QR, escarapelas, certificados, exportes.
- **Correos** editables desde el panel, con audiencias y campañas (Resend o Amazon SES).
- **Voluntarios**: convocatoria, selección y certificado: el oficial del
  programa si es un AWS Student Community Day, uno con tu tema si es otro Community Day.
- **Pasaporte digital**: cada asistente junta sellos de stands y charlas con su QR.
- **Ocho temas de color**, o el tuyo a partir de un solo color.
- **Legible para máquinas**: `/llms.txt`, `/llms-full.txt`, `/api/evento` y JSON-LD.

## Pruébalo en dos minutos

Sólo hace falta Node 20.19 o más. Ni base de datos, ni cuentas, ni llaves.

```bash
git clone https://github.com/heysebitas/aws-community-day-kit.git
cd aws-community-day-kit
npm install
npm run demo
```

Abre <http://localhost:3000>. El panel está en `/admin/login` con
`demo@example.com` / `demo-demo-demo`. Los datos viven en memoria y se pierden
al cerrar.

## Monta tu evento

**Con un asistente de IA** (Claude Code, Kiro, Codex, Cursor, Copilot…). Abre
el repo y dile:

> Lee `docs/asistente.md` y ayúdame a configurar mi evento.

Te hace unas quince preguntas, escribe la configuración y te lo enseña andando.
En Claude Code también está el comando `/configurar-evento`.

**A mano:**

```bash
npm run setup     # pregunta lo básico y escribe evento/config.ts y .env.local
npm run doctor    # dice qué falta
```

Después se completa el contenido en `evento/` (equipo, keynotes,
patrocinadores, tracks) y se despliega.

## Quién lo usa

| Edición | Sitio |
|---|---|
| AWS Student Community Day Colombia | [awsstudentcommunity.day](https://awsstudentcommunity.day) |
| AWS Student Community Day Chile | [scdchile.cl](https://scdchile.cl) |
| AWS Student Community Day México | [studentcommunitydaymexico.com](https://studentcommunitydaymexico.com/) |

¿Montaste el tuyo con el kit? Abre un PR y súmalo a la lista.

## Cómo está armado

```
evento/          tu edición: lo único que editas
public/evento/   tus fotos y logos
src/             el kit
docs/            la documentación
```

| Para | Lee |
|---|---|
| Cada campo de la configuración | [docs/configuracion.md](docs/configuracion.md) |
| Equipo, keynotes, patrocinadores, tracks | [docs/contenido.md](docs/contenido.md) |
| Colores | [docs/temas.md](docs/temas.md) |
| Tu país: documentos, teléfono, ley de datos | [docs/paises.md](docs/paises.md) |
| El panel: roles, permisos y secciones | [docs/panel.md](docs/panel.md) |
| Los datos: los modelos y cómo se relacionan | [docs/datos.md](docs/datos.md) |
| MongoDB Atlas, Amazon DocumentDB, PostgreSQL | [docs/base-de-datos.md](docs/base-de-datos.md) |
| Resend o Amazon SES | [docs/correo.md](docs/correo.md) |
| Publicarlo | [docs/despliegue.md](docs/despliegue.md) |
| El bucket de archivos y sus cabeceras | [docs/bucket.md](docs/bucket.md) |
| Qué protege el kit y qué te toca a ti | [docs/seguridad.md](docs/seguridad.md) |
| Cómo funciona por dentro | [docs/arquitectura.md](docs/arquitectura.md) |
| Correr las pruebas | [docs/pruebas.md](docs/pruebas.md) |
| Cuando algo falla | [docs/troubleshooting.md](docs/troubleshooting.md) |
| De una edición a la siguiente, copias y limpieza | [docs/nueva-edicion.md](docs/nueva-edicion.md) |

## Participar

¿Encontraste un error o le falta algo a tu país? Abre un
[issue](https://github.com/heysebitas/aws-community-day-kit/issues/new/choose) o
manda un PR: [CONTRIBUTING.md](CONTRIBUTING.md) lo explica en una página. Los
problemas de seguridad van por privado: [SECURITY.md](SECURITY.md). Lo que
viene está en [ROADMAP.md](ROADMAP.md).

## Licencia

[MIT](LICENSE). Úsalo, cámbialo y móntalo donde quieras.

Este es un proyecto de la comunidad: no es un producto de Amazon Web Services
ni está respaldado por AWS. Las marcas son de sus dueños y el kit no te da
permiso para usarlas; ver [NOTICE.md](NOTICE.md).

Hecho por [Sebastián Acuña](https://github.com/heysebitas).
