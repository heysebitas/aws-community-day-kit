# Cómo participar

Gracias por querer mejorar el kit. Se puede escribir en español o en inglés.

## Reportar algo

Abre un [issue](https://github.com/heysebitas/community-day-kit/issues/new/choose).
Hay tres plantillas:

- **Error**: algo no funciona. Cuenta qué hiciste, qué esperabas y qué pasó.
  Si se reproduce con `npm run demo`, mejor: lo podemos ver igual que tú.
- **Idea**: algo que le falta al kit. Cuenta para qué lo necesitas, no sólo qué.
- **Mi país**: un documento, un nivel de estudio, una ley o un formato que
  está mal o falta en tu país. Son los reportes más valiosos.

**Nunca pegues datos reales** de asistentes, llaves ni tu `.env.local` en un
issue. Los problemas de seguridad no van en issues: ver [SECURITY.md](SECURITY.md).

## Mandar un cambio

```bash
git clone https://github.com/<tu-usuario>/community-day-kit.git
cd community-day-kit
npm install
npm run demo        # el sitio en http://localhost:3000, sin configurar nada
```

1. Haz un fork y una rama desde `main` (`arreglo/rut-con-k`, `pais/paraguay`).
2. Haz el cambio. Las reglas del código caben en una página: [AGENTS.md](AGENTS.md).
3. `npm run check` y `npm run build` tienen que pasar.
4. Abre el PR contando **qué cambia y por qué**. Si se ve, pon una captura
   (`node scripts/captura.mjs http://localhost:3000/ antes.png`).

PR pequeños se revisan rápido. Si es algo grande, abre antes un issue para
ponernos de acuerdo y no trabajar en vano.

## Lo que hace que un PR entre

- **Sirve a cualquier edición.** Nada de un país, una ciudad, un año o una
  sede escritos en `src/`: eso va en `evento/` o sale de la configuración.
- **Textos en los dos idiomas** (`src/messages/es.json` y `en.json`).
- **Colores del tema**, no hexadecimales.
- **Una prueba** si arreglas un error o tocas validación, permisos o seguridad.
- **Sin dependencias nuevas** salvo que hagan falta de verdad; cuéntalo en el PR.

## Lo que no entra en el kit

Actividades propias de una sola edición (un reto, una dinámica, una página de
un patrocinador). Móntalas en tu fork: para eso es. Si crees que le sirve a
todo el mundo, abre una idea.

## Usar un asistente de IA

Adelante: el repo está preparado para eso (`AGENTS.md`). Tú respondes por lo
que mandas: léelo, pruébalo y entiéndelo antes de abrir el PR.

## Convivencia

Aplica el [código de conducta](CODE_OF_CONDUCT.md). Al contribuir aceptas que
tu aporte se publique bajo la [licencia MIT](LICENSE).
