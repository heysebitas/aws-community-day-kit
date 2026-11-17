# Configurar un evento con un asistente de IA

Para quien organiza. Copia uno de estos mensajes en tu asistente (Claude Code,
Kiro, Codex, Cursor, Copilot, Gemini…) y responde lo que te pregunte.

**Si ya tienes el repo abierto en tu editor:**

```text
Lee docs/asistente.md y AGENTS.md y ayúdame a configurar mi evento.
```

**Si todavía no lo tienes** (el asistente lo clona por ti):

```text
Clona https://github.com/heysebitas/aws-community-day-kit, lee su
docs/asistente.md y AGENTS.md, y ayúdame a configurar mi evento.
```

En Claude Code también existe el comando `/configurar-evento`.

Lo que sigue son las instrucciones para el asistente.

---

## Tu tarea

Dejar este kit configurado para el evento de la persona con la que hablas,
funcionando en su máquina en modo demo, y decirle con claridad qué le queda
por hacer. No edites `src/`: una edición se configura sólo en `evento/` y
`public/evento/` (ver `AGENTS.md`).

Antes de preguntar nada, enséñale cómo se ve: arranca la demo (paso 1) y
pásale la URL. Ver el sitio funcionando con datos de ejemplo le ayuda a
responder, y a ti te confirma que el entorno sirve.

## 1. Prepara el terreno

```bash
git clone https://github.com/heysebitas/aws-community-day-kit.git   # si no está clonado
cd aws-community-day-kit
node --version    # 20.19 o más; si es menor, díselo y para aquí
npm install
npm run demo      # http://localhost:3000, con datos de ejemplo
```

`npm run demo` se queda corriendo: lánzalo en segundo plano o en otra
terminal. La primera carga de cada página tarda unos segundos porque compila;
`npm run demo -- --produccion` compila todo al principio y luego va rápido.

Si `npm install` falla en Windows por permisos o en un Mac por la arquitectura,
revisa `docs/troubleshooting.md` antes de intentar arreglos por tu cuenta.

## 2. Pregunta

Haz las preguntas **en tandas cortas**, en el idioma de la persona, y propón un
valor por omisión cuando lo haya. No inventes datos: lo que no sepa todavía se
deja como «Por confirmar» y se anota para el final.

**Lo básico**
1. ¿Vas a organizar un **AWS Student Community Day** (`scd`) u otro **Community Day** (`cd`)?
   De esto depende el certificado de voluntariado: un SCD usa el oficial del
   programa; un CD, uno genérico con su tema. También cambia los valores por omisión.
2. ¿Cómo se llama el evento, sin país ni año? (por omisión: «AWS Student
   Community Day» si es `scd`, «AWS Community Day» si es `cd`)
3. ¿En qué país y ciudad? → código de país: `AR BO BR CL CO CR CU DO EC SV GT HN MX NI PA PY PE PR UY VE`
4. ¿Qué va después del nombre: el país («Colombia») o la ciudad («Bogotá»)?
5. ¿Fecha, hora de apertura de puertas y hora de cierre? (hora local)
6. ¿Quién organiza? (el nombre que firma: un grupo, una comunidad)

**La sede**
7. Nombre, dirección y barrio o comuna.
8. Coordenadas (para el globo de la portada) y un enlace de «cómo llegar».
   Si no las tiene, búscalas tú y confírmalas con la persona.
9. ¿Cómo se llega, en una frase? (va en las preguntas frecuentes)

**El formato**
10. ¿Presencial, online o los dos? ¿Cuántos cupos se anuncian?
11. ¿Qué tema de color? Muéstrale `docs/img/temas.webp`. Opciones: `naranja`,
    `lavanda`, `platano`, `menta`, `cielo`, `coral`, `rosa`, `lima`, o un color propio (`#12AB34`).
12. ¿En qué idiomas? (`es`, `en`; el primero es el principal)

**Fechas de la convocatoria**
13. ¿Cuándo cierra el Call for Speakers y cuándo se entregan las diapositivas?
    (por omisión: 31 y 10 días antes del evento)

**Contacto y publicación**
14. Correos de contacto, de privacidad y de patrocinios.
15. ¿Qué dominio va a usar? ¿Instagram o LinkedIn del evento?

## 3. Escribe la configuración

Arma un `respuestas.json` con la forma de `npm run setup -- --plantilla` y
aplícalo. En `ejemplos/` están los de tres ediciones reales —Colombia, Chile y
México—: copia el más parecido a lo que te contaron y cambia lo necesario.

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
- Si es un SCD (`scd`): pedir la plantilla del certificado oficial a su
  contacto del programa y guardarla como `recursos/certificado-sbg.pdf`. No
  viene en el kit y no se sube al repo; sin ella sale el genérico.
- Si es un Community Day (`cd`): quién firma el certificado de voluntariado
  (`detalles.certificado` en `evento/config.ts`).

No hagas commit, no despliegues y no crees cuentas en servicios externos sin
que te lo pidan.

## Las guías

Para lo que no cabe en esta entrevista:

| Para | Lee |
|---|---|
| Cada campo de la configuración y las variables de entorno | `docs/configuracion.md` |
| El contenido de la edición (equipo, keynotes, patrocinadores, tracks) | `docs/contenido.md` |
| El panel: roles, permisos y secciones | `docs/panel.md` |
| Los datos: los modelos y cómo se relacionan | `docs/datos.md` |
| Correr las pruebas | `docs/pruebas.md` |
| Cuando algo falla (captcha, bucket, IP) | `docs/troubleshooting.md` |
| De una edición a la siguiente, copias y limpieza | `docs/nueva-edicion.md` |
