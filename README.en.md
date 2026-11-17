# AWS Community Day Kit

The website, forms and operations panel for a **Student Community Day**, ready
for any community in Latin America to run their own. It grew out of the 2026
Colombia and Chile editions and ships with nothing from either: you describe
your event in one folder and everything else adapts.

[Español](README.md) · the code, comments and docs are in Spanish.

![The eight colour themes](docs/img/temas.png)

## What you get

- **Public site** in Spanish and English: landing page with a globe pointing at
  your venue, agenda, speakers, sponsors, FAQ, legal pages.
- **Forms** for registration, Call for Speakers and volunteers, with the ID
  documents, phone formats and education levels of 20 countries.
- **Admin panel** with roles and permissions: proposal review, agenda with
  clash detection, QR check-in, badges, certificates, exports.
- **Emails** edited from the panel, with audiences and campaigns (Resend or Amazon SES).
- **Volunteers**: call, selection and certificate: the official programme one
  for an AWS Student Community Day, a themed one for any other Community Day.
- **Digital passport**: attendees collect stamps from booths and talks with their QR.
- **Eight colour themes**, or your own derived from a single colour.
- **Machine-readable**: `/llms.txt`, `/llms-full.txt`, `/api/evento` and JSON-LD.

## Try it in two minutes

You only need Node 20.19+. No database, accounts or keys.

```bash
git clone https://github.com/heysebitas/aws-community-day-kit.git
cd aws-community-day-kit
npm install
npm run demo
```

Open <http://localhost:3000>. The panel is at `/admin/login`, with
`demo@example.com` / `demo-demo-demo`. Data lives in memory and is gone when you stop it.

## Set up your event

**With an AI assistant** (Claude Code, Kiro, Codex, Cursor, Copilot…), open the
repo and say:

> Read `docs/asistente.md` and help me set up my event.

It asks about fifteen questions, writes the configuration and walks you
through it. In Claude Code there is also the `/configurar-evento` command.

**By hand:**

```bash
npm run setup     # asks the basics, writes evento/config.ts and .env.local
npm run doctor    # tells you what is missing
```

Then you fill in the content in `evento/` (team, keynotes, sponsors, tracks)
and you deploy it.

## Who uses it

| Edition | Site |
|---|---|
| AWS Student Community Day Colombia | [awsstudentcommunity.day](https://awsstudentcommunity.day) |
| AWS Student Community Day Chile | [scdchile.cl](https://scdchile.cl) |
| AWS Student Community Day Mexico | [studentcommunitydaymexico.com](https://studentcommunitydaymexico.com/) |

Running yours on the kit? Open a PR and add it to the list.

## How it's put together

```
evento/          your edition: the only thing you edit
public/evento/   your photos and logos
src/             the kit
docs/            the documentation
```

| For | Read |
|---|---|
| Every field of the configuration | [docs/configuracion.md](docs/configuracion.md) |
| Team, keynotes, sponsors, tracks | [docs/contenido.md](docs/contenido.md) |
| Colours | [docs/temas.md](docs/temas.md) |
| Your country: documents, phone, data law | [docs/paises.md](docs/paises.md) |
| The admin panel: roles, permissions, sections | [docs/panel.md](docs/panel.md) |
| The data: models and how they relate | [docs/datos.md](docs/datos.md) |
| MongoDB Atlas, Amazon DocumentDB, PostgreSQL | [docs/base-de-datos.md](docs/base-de-datos.md) |
| Resend or Amazon SES | [docs/correo.md](docs/correo.md) |
| Publishing it | [docs/despliegue.md](docs/despliegue.md) |
| The file bucket and its headers | [docs/bucket.md](docs/bucket.md) |
| What the kit protects and what is up to you | [docs/seguridad.md](docs/seguridad.md) |
| How it works inside | [docs/arquitectura.md](docs/arquitectura.md) |
| Running the tests | [docs/pruebas.md](docs/pruebas.md) |
| When something breaks | [docs/troubleshooting.md](docs/troubleshooting.md) |
| From one edition to the next, backups, clean-up | [docs/nueva-edicion.md](docs/nueva-edicion.md) |

## Contributing

Issues and pull requests are welcome, in Spanish or English:
[CONTRIBUTING.md](CONTRIBUTING.md). Report security problems privately:
[SECURITY.md](SECURITY.md). What is coming is in
[ROADMAP.md](ROADMAP.md).

## License

[MIT](LICENSE). This is a community project, not an Amazon Web Services product
and not endorsed by AWS. Trademarks belong to their owners and the kit grants
no right to use them; see [NOTICE.md](NOTICE.md).

Made by [Sebastián Acuña](https://github.com/heysebitas).
