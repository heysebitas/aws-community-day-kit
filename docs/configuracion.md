# Configuración

Todo está en `evento/config.ts`. `npm run setup` lo escribe por ti; esto es
para cuando quieras tocarlo a mano. Los tipos, con un comentario por campo,
están en `src/config/tipos.ts`, y `npm run doctor` te dice si algo quedó mal.

## Identidad

| Campo | Qué es |
|---|---|
| `nombre`, `siglas` | «AWS Student Community Day», «SCD» |
| `edicion` | Lo que va después del nombre: el país o la ciudad |
| `anio`, `pais`, `ciudad` | `pais` es un código de [docs/paises.md](paises.md) |
| `organiza` | Quién firma los correos, las cartas y los textos legales |
| `sitio` | La URL pública, sin barra final |
| `marca` | El logo del encabezado (`logo` en SVG, `logoPng` para los PDF) y las líneas de texto que lo acompañan |

## Fecha y sede

Las horas se escriben **en hora local** (`"2027-10-23T08:30"`); la zona sale
del país. Con `fecha.confirmada: false` el sitio dice «por confirmar».

`sede.coordenadas` mueve el marcador del globo de la portada. Sin coordenadas,
señala la capital. `sede.silueta` dibuja el horizonte de la ciudad detrás de la
sede: `"auto"` lo genera, `"ninguna"` lo quita.

## Formato

- `cupos` y `modalidad` (`presencial`, `online`).
- `tema`: ver [docs/temas.md](temas.md).
- `idiomas`: `["es", "en"]`. El primero es el principal y va sin prefijo en la URL.
- `marca.mascota` (opcional): la ilustración de tu edición, un PNG con fondo
  transparente en `public/evento/`. Sale en la portada, el pasaporte y las
  tarjetas de speaker; sin ella, esos huecos no se dibujan.
- `rastreoIA`: si `robots.txt` deja pasar a los rastreadores de IA y se publican
  `/llms.txt` y `/llms-full.txt`.

## Call for Speakers

`cfp.cierre` y `cfp.slides` son fechas límite que el formulario hace cumplir.
`cfp.online` abre la opción de charla remota. `cfp.hitos` son los textos de las
etapas intermedias, tal como se muestran.

## Detalles

`detalles` reúne lo que aparece en preguntas frecuentes y correos: cómo llegar,
cuántos speakers se esperan, consejos de viaje para la carta de invitación
internacional, quién firma el certificado de voluntariado, la encuesta final.

`detalles.legalActualizado` es la fecha que muestran los textos legales.

## Los textos legales son una plantilla

Privacidad y términos se arman con los datos de tu país (ley, autoridad) y de
tu evento. Son un buen punto de partida, **no asesoría legal**: léelos enteros
y pásalos por alguien que conozca la norma local antes de recibir datos reales.

## Cambiar un texto del sitio

Los textos están en `src/messages/es.json` y `en.json`. Los datos de la edición
no se escriben: se usan como `[[ciudad]]`, `[[fecha]]`, `[[sede]]`… (la lista
completa en `src/i18n/tokens.ts`). Si cambias una clave, cámbiala en los dos.

## Lo que se edita desde el panel

Sin tocar código, en **Configuración del evento**: abrir y cerrar formularios,
enlaces de los correos (grupos de WhatsApp, mapa, encuesta), salas y sellos del
pasaporte. La agenda, los speakers y las preguntas frecuentes también viven en
la base y se gestionan desde el panel.
