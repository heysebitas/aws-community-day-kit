---
inclusion: manual
---

# kit-verificar

Se usa antes de dar por terminado un cambio del kit. Ejecuta `npm run check`, `npm run build`, levanta `npm run demo` y captura las páginas tocadas con `node scripts/captura.mjs`. El resultado es APTO sólo si todo pasa y las capturas están bien; si `npm run check` falla, el resultado es NO APTO y hay que enumerar los fallos concretos.

El procedimiento completo está en:

#[[file:.claude/skills/kit-verificar/SKILL.md]]
