---
inclusion: manual
---

# kit-medir

Se usa al medir Lighthouse y el bundle de las páginas públicas. Primero ejecuta `npm run build`; luego levanta ese build con la demo y usa `npm run medir -- --url http://localhost:3000`. La medición necesita Chrome y la CLI `lighthouse`. Compara con la línea base mediante `--comparar` y resume cualquier regresión antes de terminar con `npm run medir -- --url http://localhost:3000 --comparar`.

El procedimiento completo está en:

#[[file:.claude/skills/kit-medir/SKILL.md]]
