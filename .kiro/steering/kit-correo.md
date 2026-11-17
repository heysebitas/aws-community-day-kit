---
inclusion: manual
---

# kit-correo

Se usa al crear o modificar un correo. Una plantilla nueva es una lista de bloques, con su texto de fábrica en `src/emails/semilla.ts`; no se añade un componente React de correo nuevo. Un correo de sistema declara su clave en `SISTEMA`, y uno de campaña usa `deSistema: false`. Los envíos masivos registran cada tramo y llevan cerrojo. Revisa las pruebas de correo y termina con `npm test` y `npm run check`.

El procedimiento completo está en:

#[[file:.claude/skills/kit-correo/SKILL.md]]
