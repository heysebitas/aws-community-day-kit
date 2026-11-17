Las reglas de este repositorio están en `AGENTS.md`, en la raíz: léelo antes de
proponer cambios. Si te piden configurar un evento, sigue `docs/asistente.md`.

Lo más importante:

- Lo de una edición va en `evento/` y `public/evento/`; `src/` es el kit y no
  lleva datos de ningún evento.
- Textos en `src/messages/es.json` y `en.json` a la vez; colores sólo con los
  tokens del tema; nada de `alert`, `confirm` ni `prompt`.
- Toda ruta de `src/app/api/` que no sea pública empieza por `requireAuth`,
  `requireAccess`, `requireAnyAccess` o `requireDelete`.
- Antes de dar algo por terminado: `npm run check` y `npm run build`.
