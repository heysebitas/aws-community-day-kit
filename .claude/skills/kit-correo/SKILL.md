---
name: kit-correo
description: "Úsala al crear o modificar un correo para mantenerlo como bloques editables y dejar su contenido de fábrica en la semilla."
---

# Añadir o revisar un correo

## Antes de escribir

Decide si el correo es de sistema o de campaña:

- **De sistema:** lo dispara el código a una persona. Su clave pertenece a `SISTEMA` en `src/models/email-template.ts`.
- **De campaña:** lo envía una persona desde el panel. Su semilla usa `deSistema: false` y, normalmente, define `disparador` y `audiencia`.

## Pasos

1. Lee `src/emails/bloques.ts` para conocer los tipos de bloque, sus campos obligatorios, las variables `{nombre}` disponibles y las banderas `mostrarSi`.
2. **No añadas otro componente React de correo.** Ya existen cuatro excepciones y no se añaden más:
   - `src/emails/invitation.tsx`
   - `src/emails/speaker-submission-confirmation.tsx`
   - `src/emails/passport-edit-confirm.tsx`
   - `src/emails/volunteer-certificate.tsx`
3. Para un correo nuevo, edita la semilla de `src/emails/semilla.ts`: asunto, vista previa y una lista de `bloques`. Usa bloques del catálogo, conserva la forma de sus datos y no escribas la plantilla como JSX. La semilla es el contenido inicial o de fábrica; la copia ya guardada en la base sigue siendo editable.
4. Si es de sistema, añade su clave a `SISTEMA` en `src/models/email-template.ts`. Si es de campaña, no la añadas. La semilla debe incluir todas las claves de sistema o el propio módulo falla al arrancar.
5. Dispara el correo de sistema con `armarCorreo` de `src/lib/email-plantillas.ts`, pasando los valores de la persona y sus banderas. Las variables del evento se añaden solas.
6. Usa `{variable}` para los datos de correo; no son los tokens `[[...]]` de los textos del sitio. No escribas una fecha, ciudad, país o sede fija en una semilla.
7. Si el correo forma parte de un envío masivo, manda por tramos y anota cada tramo al terminar. Toma un cerrojo por plantilla o campaña para impedir dos envíos simultáneos; consulta `src/lib/correo.ts` y `src/app/api/admin/campanas/enviar/route.ts`.
8. Añade o ajusta la prueba de correo que corresponda en `tests/bloques-correo.test.ts` y `tests/flujos-correo.test.ts`. No envíes a una cuenta real: usa la demo o el proveedor de consola.

## Comprobación final

```bash
npm test
npm run check
```

Las pruebas de bloques, plantillas y flujos de correo deben pasar. Comprueba también que la nueva clave aparece una sola vez, que el correo se puede sembrar y que ningún envío nuevo introduce un componente React fuera de las cuatro excepciones.
