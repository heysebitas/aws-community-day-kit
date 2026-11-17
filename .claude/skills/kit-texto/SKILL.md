---
name: kit-texto
description: "Úsala al añadir o modificar textos del sitio para mantenerlos en todos los idiomas y usar tokens de datos del evento."
---

# Añadir o revisar textos

## Pasos

1. Localiza el espacio de nombres y la clave existentes. Los textos del sitio viven en todos los archivos JSON de `src/messages/`; no se escribe una cadena visible directamente en un componente.
2. Añade la misma clave, con la misma estructura, en **todos** los idiomas de `src/messages/`. Traduce el valor: no copies el español a ciegas. La lista real de idiomas sale de la edición y las pruebas comprueban que sus claves coincidan.
3. Sustituye los datos de la edición por tokens de `src/i18n/tokens.ts`:
   - usa `[[evento]]`, `[[fecha]]`, `[[ciudad]]`, `[[pais]]`, `[[anio]]` y el resto de tokens existentes;
   - no escribas un año, una ciudad, un país, una fecha, una sede ni otro dato de la edición dentro del texto;
   - no inventes un token: primero se añade al catálogo y después se usa.
4. En el componente, recupera el texto con `useTranslations` o `getTranslations` según corresponda. `src/i18n/request.ts` resuelve después los tokens con los datos de la edición.
5. Revisa también el texto visible que no vive en los mensajes: títulos, etiquetas, `aria-label`, `placeholder`, `alt` y textos de error deben salir del catálogo o usar los patrones ya existentes para ese idioma.
6. No añadas datos de una edición a `src/`. Si hace falta un dato nuevo de configuración, llévalo a `evento/config.ts` mediante el procedimiento de configuración del evento.

## Comprobación final

```bash
npm test
npm run check
```

Las pruebas de `tests/mensajes.test.ts` deben confirmar que todos los idiomas tienen las mismas claves y que todos los tokens existen. `tests/textos-i18n.test.ts` y `tests/datos-edicion.test.ts` deben encontrar sin textos escritos a mano ni datos de la edición dentro de `src/`.
