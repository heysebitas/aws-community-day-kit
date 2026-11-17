# Datos

Qué se guarda, dónde y cómo se relacionan. Los esquemas están en
`src/models/`; la lista con sus campos clave está en
[arquitectura.md](arquitectura.md).

## El diagrama

```
  Formulario público                    Panel
  ─────────────────                    ─────
        │                                 │
        ▼                                 ▼
   Registration ◄──── mover ────┐   AgendaEvent ──► SpeakerProfile
        │  (asistente)          │        ▲                │
        │                       │        │                │
        │ qrCode                │        └── ponente ─────┘
        ▼                       │
      Pase (PDF)                │
        │                       │
   check-in ──────────►  Attendance
        │                       │
        │                       ▼
        │                  VolunteerSubmission
        │                  (voluntario)
        │                       │
        ▼                       ▼
     Passport ◄─── generar ───┘
        │  (pasaporte digital)
        │
        ├── stamps ─────────► SponsorPin (patrocinador)
        ├── sessionAttendance ► AgendaEvent (sala)
        ├── meals (almuerzo / refrigerio)
        └── social, foto, PIN de vista
```

## Quién escribe qué

| Colección | La escribe | Cuándo |
|---|---|---|
| Registration, VolunteerSubmission, SpeakerProfile | Los formularios del sitio | Cuando alguien se registra, postula o manda su propuesta |
| Passport | El panel (a mano o generado desde un registro) | Al crear el pasaporte de alguien |
| AgendaEvent, Room | El panel | Al armar el horario y los salones |
| EmailTemplate, EmailCampana, EmailEnvio | El panel y el código | Al editar una plantilla, al lanzar una campaña y en cada envío |
| FAQ, EventConfig, Form, Setting | El panel | Al cambiar lo que se puede cambiar sobre la marcha |
| User, Session, Log | El código | Al entrar, al cambiar de dispositivo y en cada acción del panel |
| PasswordToken, PassportEditToken | El código | Al pedir un enlace de un solo uso |

## Cómo se relacionan

- Un **registro** y su **pasaporte** se unen por `linkedRegistrationId`. En los
  asistentes, el código del pasaporte es el mismo que el del QR del pase, así
  que el escáner de la puerta lo encuentra sin buscar por nombre.
- La **agenda** apunta al speaker por `speakerId` y a la sala por `roomId`;
  borrar un speaker deja la agenda sin ponente.
- Un **envío** apunta a su campaña por `campana` y repite el `slug` de la
  plantilla, para poder mirar los fallos de una sin cruzarla con otra.
- El **token de la encuesta** apunta a su origen (`source` + `sourceId`): un
  destinatario por persona, aunque se reenvíe el correo.

## Lo que se borra solo

Tres colecciones tienen índice de caducidad (TTL): MongoDB borra el documento
cuando vence `expiresAt`.

| Colección | Caduca |
|---|---|
| Session | La duración de la sesión |
| PasswordToken | El enlace de un solo uso para elegir contraseña |
| PassportEditToken | Las 24 h del cambio de pasaporte |

## Las búsquedas

`Registration` y `Passport` guardan un arreglo `busqueda` con las palabras
normalizadas de su nombre, correo, documento y código. Es lo que permite
encontrar a alguien en la puerta tecleando parte de su nombre o su documento,
sin acentos ni mayúsculas. El arreglo se recalcula solo (un hook del
esquema); para rellenarlo en una base vieja,
`node scripts/rellenar-busqueda.mjs --aplicar` (lee `MONGODB_URI` de
`.env.local`).

## Las audiencias

Una **audiencia** no es una lista guardada: es una definición (público +
filtros) que se resuelve **en el momento de enviar**, así que quien se
registra entre que se arma la campaña y se manda, entra. Lo que sí se guarda
es `sentCampaigns` en cada persona: el slug de las plantillas que ya recibió,
para no repetirlas.
