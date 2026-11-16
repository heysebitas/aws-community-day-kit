# Seguridad

## Reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub:
[Security → Report a vulnerability](https://github.com/heysebitas/community-day-kit/security/advisories/new).

Cuenta, en español o en inglés:

- qué se puede hacer y a quién afecta,
- cómo reproducirlo (lo ideal: sobre `npm run demo`),
- la versión o el commit.

No pruebes contra el sitio de un evento real ni accedas a datos de personas:
el modo demo tiene todo lo necesario para investigar.

Qué esperar: respuesta en una semana, y un arreglo o un plan en treinta días
para lo que sea grave. Cuando esté resuelto se publica un aviso y, si quieres,
con tu nombre. Esto lo mantiene una persona en su tiempo libre: no hay
recompensas, sí agradecimiento.

## Versiones

Sólo se corrige la rama `main`. Si montaste un evento con el kit, trae los
cambios de `main` a tu fork antes de abrir registros.

## Si organizas un evento

Las medidas del kit y lo que queda de tu lado están en
[docs/seguridad.md](docs/seguridad.md). Si descubres que tu despliegue expuso
datos de asistentes, además de corregirlo revisa qué te exige la ley de
protección de datos de tu país: muchas obligan a avisar a los afectados.
