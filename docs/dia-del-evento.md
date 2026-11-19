# El día del evento

Lo que hay que tener decidido antes de abrir la puerta. El kit asume que en la
sede **todos los móviles salen por una sola IP** (la red del lugar), así que los
límites no cuentan por IP para lo que hace el staff: el login cuenta solo fallos
por IP y correo, el sello cuenta fallos por pasaporte.

## Una cuenta por dispositivo

Abrir sesión en un dispositivo **cierra la anterior** de esa cuenta
(`docs/troubleshooting.md`). Si dos personas comparten cuenta, se echan una a
otra de la puerta. Crea una cuenta por móvil o tableta (rol `volunteer`) desde
`/admin/users`, con un correo que sea tuyo, antes del día.

Cuando un escáner recibe un 401 vuelve al login con el aviso «Tu sesión se
abrió en otro dispositivo». Para reabrir sesión: entra con tu cuenta y vuelve a
`/admin/escaner/...`; el escaneo que falló no se registró, repítelo.

## Qué ve quien escanea

| Pantalla | Qué pasó |
|---|---|
| «No encontrado» | El servidor respondió 404: ese código no existe |
| «Reintenta» | Límite (429), error del servidor (5xx) o 8 s sin respuesta. Ya se reintentó una vez solo |
| «Sin permiso» | 403: la cuenta no tiene ese escáner (o ese badge) |
| Login con aviso | 401: la sesión cayó o se abrió en otro dispositivo |

Un «Ya hizo check-in» del mismo usuario en menos de 30 s se muestra como éxito:
es su propio doble escaneo.

## Si algo cae

- **La red de la sede**: pasa a datos móviles de cada dispositivo (las cuentas
  ya abiertas siguen valiendo) o usa el modo manual con la lista exportada del
  panel. Nada se guarda en el móvil: lo que no llegó al servidor no está
  registrado; vuelve a escanear al recuperarla.
- **El correo (Resend o SES)**: el check-in, los escáneres y el pasaporte no lo
  usan. Los correos fallidos se reenvían después desde el panel, sin prisa.
- **La base de datos**: nadie puede escanear ni entrar al panel (todo da
  «Reintenta»). Ten impresa o exportada la lista de registrados la noche
  anterior, deja pasar con ella y registra los check-ins al volver la base.

## Quién tiene qué rol

| Rol | Para qué en el día |
|---|---|
| `admin` | Una o dos personas de la organización: usuarios, correo, todo |
| `organizer` | Quien coordina; ve lo que le den sus permisos |
| `volunteer` | Puerta, salas y almuerzos: check-in, escáneres y escarapelas |
| `badges` | Un stand: solo da los badges que tiene asignados |

Detalle de permisos en [panel.md](panel.md). Prueba cada cuenta en su móvil
con cámara y con datos móviles **el día anterior**.
