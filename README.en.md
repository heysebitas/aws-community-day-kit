# AWS Community Day Kit

The website, forms and operations panel for an **AWS Student Community Day**
or any **Community Day**, ready for any community in Latin America to run
their own. It is the platform behind the Student Community Days in
[Colombia](https://awsstudentcommunity.day), [Chile](https://scdchile.cl) and
[Mexico](https://studentcommunitydaymexico.com/), with nothing left from any of
them: you describe your event in one folder and everything else adapts.

[Español](README.md) · [Full gallery](docs/galeria.md) · [For AI assistants](AGENTS.md) · the code, comments and docs are in Spanish.

![The site on desktop and on a phone](docs/img/galeria/presentacion.webp)

## Try it in two minutes

You only need [Node](https://nodejs.org) 20.19+. No database, accounts or keys.

```bash
git clone https://github.com/heysebitas/aws-community-day-kit.git
cd aws-community-day-kit
npm install
npm run demo
```

Open <http://localhost:3000>. It ships with invented sample data —speakers,
agenda, attendees, volunteers— so everything looks like event day.

| To see | Go to |
|---|---|
| The admin panel | `/admin/login` with `demo@example.com` / `demo-demo-demo` |
| A digital passport | `/pasaporte/demo00000001`, PIN `1234` |
| The English site | `/en` |

Data lives in memory and is gone when you stop it.

## Set up your event

**With an AI assistant** (Claude Code, Kiro, Codex, Cursor, Copilot, Gemini…),
open the repo and paste:

```text
Read docs/asistente.md and AGENTS.md and help me set up my event.
```

Haven't cloned it yet? Paste this and it will:

```text
Clone https://github.com/heysebitas/aws-community-day-kit, read its
docs/asistente.md and AGENTS.md, and help me set up my event.
```

**By hand:**

```bash
npm run setup     # asks the basics, writes evento/config.ts and .env.local
npm run doctor    # tells you what is missing
```

Everything about your edition lives in `evento/` and `public/evento/`; `src/`
is the kit. The guides are in [docs/](docs/).

## What you get

- **Public site** in Spanish and English, mobile first: landing page with a
  globe pointing at your venue, agenda, speakers, sponsors, FAQ, legal pages.
- **Forms** for registration, Call for Speakers and volunteers, with the ID
  documents, phone formats and education levels of 20 countries.
- **Admin panel** with roles and permissions: proposal review, agenda with
  clash detection, QR check-in from a phone, badges, certificates, exports.
- **Emails** built from blocks and edited in the panel, with audiences and
  campaigns (Resend or Amazon SES).
- **Digital passport**, **speaker cards** for social media and **volunteer certificates**.
- **Eight colour themes**, or your own from a single colour.
- **Machine-readable**: `/llms.txt`, `/llms-full.txt`, `/api/evento` and JSON-LD.

| | |
|---|---|
| ![Admin home](docs/img/galeria/panel-inicio.webp) | ![Attendees](docs/img/galeria/panel-registros.webp) |
| ![Email templates](docs/img/galeria/panel-plantillas.webp) | ![Agenda](docs/img/galeria/panel-programa.webp) |

![The eight colour themes](docs/img/temas.webp)

## Who uses it

| Edition | Site |
|---|---|
| AWS Student Community Day Colombia | [awsstudentcommunity.day](https://awsstudentcommunity.day) |
| AWS Student Community Day Chile | [scdchile.cl](https://scdchile.cl) |
| AWS Student Community Day Mexico | [studentcommunitydaymexico.com](https://studentcommunitydaymexico.com/) |

Running yours on the kit? Open a PR and add it to the list.

## For AI assistants

[`AGENTS.md`](AGENTS.md) has the rules, the commands and what to read for each
task; most coding assistants load it on their own. [`llms.txt`](llms.txt)
indexes the documentation for an LLM that only has the repository URL.

## Contributing

Issues and pull requests are welcome, in Spanish or English:
[CONTRIBUTING.md](CONTRIBUTING.md). Report security problems privately:
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). This is a community project, not an Amazon Web Services product
and not endorsed by AWS. Trademarks belong to their owners and the kit grants
no right to use them; see [NOTICE.md](NOTICE.md).

Made by [Sebastián Acuña](https://github.com/heysebitas).
