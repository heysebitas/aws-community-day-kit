---
inclusion: manual
---

# kit-ruta-api

Se usa al crear o revisar una ruta de `src/app/api/`. La ruta debe usar `ruta()` y `AuthError`, elegir `requireAuth`, `requireAccess`, `requireAnyAccess` o `requireDelete`, validar el cuerpo con un parser de `src/lib/`, normalizar URL con `normalizeLink` y fotos con `esDelBucket`. Si es pública, lleva `rateLimit` y captcha cuando escribe. Actualiza `tests/permisos-rutas.test.ts` y termina con `npm test` y `npm run check`.

El procedimiento completo está en:

#[[file:.claude/skills/kit-ruta-api/SKILL.md]]
