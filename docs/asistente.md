# Configurar un evento con un asistente de IA

Para quien organiza: abre el repo en tu editor con un asistente (Claude Code,
Kiro, Codex, Cursor, Copilot…) y dile:

> Lee `docs/asistente.md` y ayúdame a configurar mi evento.

Si todavía no clonaste el repo, también sirve darle la URL de este archivo.

Lo que sigue son las instrucciones para el asistente.

---

## Tu tarea

Dejar este kit configurado para el evento de la persona con la que hablas,
funcionando en su máquina en modo demo, y decirle con claridad qué le queda
por hacer. No edites `src/`: una edición se configura sólo en `evento/` y
`public/evento/` (ver `AGENTS.md`).

## 1. Prepara el terreno

```bash
node --version    # 20.12 o más
npm install
```

## 2. Pregunta

Haz las preguntas **en tandas cortas**, en el idioma de la persona, y propón un
valor por omisión cuando lo haya. No inventes datos: lo que no sepa todavía se
deja como «Por confirmar» y se anota para el final.

**Lo básico**
1. ¿Cómo se llama el evento, sin país ni año? (por omisión: «AWS Student Community Day»)
2. ¿En qué país y ciudad? → código de país: `AR BO BR CL CO CR CU DO EC SV GT HN MX NI PA PY PE PR UY VE`
3. ¿Qué va después del nombre: el país («Colombia») o la ciudad («Bogotá»)?
4. ¿Fecha, hora de apertura de puertas y hora de cierre? (hora local)
5. ¿Quién organiza? (el nombre que firma: un grupo, una comunidad)

**La sede**
6. Nombre, dirección y barrio o comuna.
7. Coordenadas (para el globo de la portada) y un enlace de «cómo llegar».
   Si no las tiene, búscalas tú y confírmalas con la persona.
8. ¿Cómo se llega, en una frase? (va en las preguntas frecuentes)

**El formato**
9. ¿Presencial, online o los dos? ¿Cuántos cupos se anuncian?
10. ¿Qué tema de color? Muéstrale `docs/img/temas.png`. Opciones: `naranja`,
    `lavanda`, `platano`, `menta`, `cielo`, `coral`, `rosa`, `lima`, o un color propio (`#12AB34`).
11. ¿En qué idiomas? (`es`, `en`; el primero es el principal)

**Fechas de la convocatoria**
12. ¿Cuándo cierra el Call for Speakers y cuándo se entregan las diapositivas?
    (por omisión: 31 y 10 días antes del evento)

**Contacto y publicación**
13. Correos de contacto, de privacidad y de patrocinios.
14. ¿Qué dominio va a usar? ¿Instagram o LinkedIn del evento?

## 3. Escribe la configuración

Arma un `respuestas.json` con la forma de `npm run setup -- --plantilla` (hay
uno real en `ejemplos/chile-2026.json`) y aplícalo:

```bash
npm run setup -- --plantilla        # la forma del archivo
npm run setup -- --desde respuestas.json
npm run doctor
```

`setup` valida antes de escribir y dice qué campo está mal. `doctor` comprueba
la configuración entera. Borra `respuestas.json` al terminar.

## 4. El contenido

Con lo que la persona ya tenga, edita en `evento/`:

- `equipo.ts` — organizadores (foto opcional en `public/evento/equipo/`)
- `keynotes.ts` — el primero sale destacado
- `patrocinadores.ts` y `comunidades.ts` — logos en `public/evento/…`, con fondo transparente
- `grupos.ts` — los grupos estudiantiles que organizan
- `tracks.ts` — los tracks; es la única lista, la usan la portada, el formulario de speakers y el panel

Lo que no tenga, déjalo vacío (`[]`): la sección correspondiente no se muestra.
Quita los datos de demostración; no dejes personas inventadas.

## 5. Enséñaselo

```bash
npm run check
npm run demo
```

Abre `http://localhost:3000`. El panel está en `/admin/login`
(`demo@example.com` / `demo-demo-demo`). En modo demo no hace falta base de
datos, ni correo, ni captcha, y los datos se pierden al cerrar.

## 6. Dile qué falta

Termina con una lista corta y concreta de lo que queda en sus manos:

- Lo que quedó «Por confirmar».
- Elegir base de datos (`docs/base-de-datos.md`), proveedor de correo
  (`docs/correo.md`) y dónde desplegar (`docs/despliegue.md`).
- Crear las llaves: captcha de Cloudflare Turnstile, bucket para archivos.
- Revisar la política de privacidad con alguien que conozca la ley de su país:
  el texto es una plantilla (`docs/configuracion.md`).
- Si usa el logo y el nombre de AWS, que tenga el visto bueno de su contacto
  en el programa (`NOTICE.md`).

No hagas commit, no despliegues y no crees cuentas en servicios externos sin
que te lo pidan.
