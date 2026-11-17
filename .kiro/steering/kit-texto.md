---
inclusion: manual
---

# kit-texto

Se usa al añadir o modificar textos del sitio. La misma clave se añade a todos los JSON de `src/messages/`; los datos de la edición se escriben con los tokens `[[...]]` existentes en `src/i18n/tokens.ts`, nunca con un año, ciudad o país escrito. Revisa `tests/mensajes.test.ts`, `tests/textos-i18n.test.ts` y `tests/datos-edicion.test.ts`; termina con `npm test` y `npm run check`.

El procedimiento completo está en:

#[[file:.claude/skills/kit-texto/SKILL.md]]
