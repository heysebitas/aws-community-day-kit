# Correo

## Proveedor

| `CORREO_PROVEEDOR` | Qué necesita | Notas |
|---|---|---|
| `resend` | `RESEND_API_KEY` | El más rápido de configurar. Con `RESEND_WEBHOOK_SECRET` el panel muestra entregas y rebotes |
| `ses` | Credenciales de AWS, `SES_REGION` | Amazon SES. La cuenta tiene que salir del *sandbox* para escribirle a cualquiera. Preparado; falta probarlo en un evento real |
| `consola` | Nada | No envía: anota destinatario y asunto en el registro. Es lo que usa la demo |

Si no pones `CORREO_PROVEEDOR`, se usa Resend cuando hay `RESEND_API_KEY` y la
consola cuando no.

En cualquiera de los dos tienes que **verificar tu dominio** (registros SPF y
DKIM) y usarlo en `EMAIL_FROM`. Añade también un registro DMARC: sin él, buena
parte de los correos termina en spam.

## Plantillas

Los correos no son archivos: cada plantilla es una lista de bloques guardada en
la base, y se edita en **Panel → Correos → Plantillas** con vista previa.

- Las **de sistema** las dispara el código, a una persona a la vez:
  confirmación de registro, propuesta recibida, aceptación, invitación al
  panel… Se puede cambiar su contenido, no su destinatario.
- No hay correos escritos como componentes de React: la invitación al panel
  (`invitacion_panel`), la confirmación de cambios del pasaporte
  (`pasaporte_confirmar`), la propuesta recibida (`speaker_postulacion`, con su
  copia incluida) y el certificado de voluntariado (`voluntario_certificado`)
  también se editan desde el panel. Los datos que cambian en cada envío, como el
  enlace de un solo uso o las filas del pasaporte, entran como variables
  (grupo «Del envío»); una fila de una ficha de datos sin valor no sale.
- Las **propias** las creas tú y se envían a una audiencia desde **Campañas**.

Encabezado y pie se generan con tu tema y tu logo; no hay imágenes que rehacer.

## Audiencias y campañas

Una audiencia es un filtro guardado («registrados que confirmaron», «speakers
aceptados de tal track»). Una campaña es una plantilla más una audiencia. Antes
de enviar, el panel muestra a cuántas personas llega y deja mandarte una prueba.

Empieza con audiencias pequeñas: los proveedores limitan el ritmo de una cuenta
nueva y la reputación del dominio se construye con los primeros envíos.

## Enlaces de los correos

Los grupos de WhatsApp, el mapa y la encuesta no están en el código: se cargan
en **Configuración del evento**. Un enlace sin valor hace desaparecer el botón
que lo usa, así que nunca sale un enlace de otra edición por descuido.

## Para un correo nuevo del sistema

Su clave va en `SISTEMA` (`src/models/email-template.ts`) y su contenido de
fábrica en `SEMILLAS` (`src/emails/semilla.ts`). El código lo pide con
`armarCorreo(clave, valores)`.
