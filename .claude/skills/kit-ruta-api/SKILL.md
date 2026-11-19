---
name: kit-ruta-api
description: "Úsala cuando crees o revises una ruta de la API en src/app/api/ para aplicar permisos, validación, límites y la prueba por ruta."
---

# Crear o revisar una ruta de API

## Antes de escribir

1. Lee `AGENTS.md`, `docs/seguridad.md` y dos rutas parecidas de `src/app/api/`.
2. Decide, método por método, si la ruta es privada o pública. Ocultar un enlace del panel no protege una API.
3. Si el cuerpo o los parámetros necesitan una forma nueva, escribe un parser como `src/lib/*-input.ts`. No pases valores recibidos directamente a Mongoose.

## Pasos

1. **Envolve el handler.** Usa `ruta()` de `src/lib/api.ts`:
   - `AuthError` conserva su estado: 401 sin sesión y 403 sin permiso.
   - `EntradaInvalida` produce 400.
   - Cualquier otro error produce 500 y se registra.
2. **Protege cada método privado.** La primera comprobación debe ser una de estas:
   - `requireAuth`, si basta con una sesión y, opcionalmente, una lista de roles.
   - `requireAccess`, si además hay que comprobar una sección de `src/lib/permisos.ts` y su nivel.
   - `requireAnyAccess`, si vale el acceso a cualquiera de varias secciones.
   - `requireDelete`, si borra datos y exige permiso de eliminación.
3. **Trata aparte lo público.** Sólo una ruta que realmente puede leer o escribir sin sesión va en la lista `PUBLICAS` de `tests/permisos-rutas.test.ts`. Toda ruta pública lleva `rateLimit` y responde 429 con `Retry-After`; si escribe, valida el captcha con `verifyCaptcha` de `src/lib/captcha.ts`.
4. **Valida la entrada en el servidor.** Reutiliza, según el dominio, `src/lib/registration-input.ts`, `src/lib/speaker-input.ts` o `src/lib/volunteer-input.ts`. `leerCuerpo` de `src/lib/cuerpo.ts` evita errores de JSON, pero no sustituye al parser.
5. **Valida las URL.** Usa `normalizeLink` de `src/lib/normalize.ts` para enlaces de redes o sitios, indicando la plataforma cuando corresponda. Una foto guardada desde un formulario sólo se acepta si `esDelBucket` de `src/lib/subidas.ts` devuelve `true`.
6. **Actualiza la tabla de permisos.** En `tests/permisos-rutas.test.ts`:
   - añade cada método público como `MÉTODO /ruta`, con un motivo y la marca `rateLimit(`;
   - usa `CONDICIONADAS` si una consulta convierte la ruta pública en protegida;
   - usa `SOLO_ROL`, `CODIGOS` o `PARAMS` sólo si de verdad aplica.
   Una ruta privada nueva no necesita una fila: la tabla la considera privada y comprueba que el fuente llame a una guarda de permisos.
7. **Revisa los errores.** No reveles datos internos en la respuesta. Deja que `ruta()` traduzca `AuthError` y `EntradaInvalida`; registra el resto con la etiqueta de la ruta.
   Las respuestas de error llevan `{ code, error }` (`code` se traduce en el cliente con `Errores.<code>` de `src/messages`; `error` en español sigue por compatibilidad) y `x-request-id`. Un `catch` que se traga un fallo lo escribe con `logError(etiqueta, e)`, que añade el id; si el silencio es deliberado, se comenta.

## Comprobación final

```bash
npm test
npm run check
```

`npm test` debe incluir la suite `permisos-rutas` en verde: cada método nuevo debe responder 401 sin sesión y 403 con una cuenta sin el permiso, salvo que se haya documentado una excepción. No pruebes contra una base real ni envíes correos.
