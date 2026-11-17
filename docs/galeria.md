# Galería

Cómo se ve el kit con la demo (`npm run demo`), tema `naranja` y los datos de
ejemplo de `src/lib/demo.ts`. Todo lo que aparece es inventado.

## El sitio

| Escritorio | Teléfono |
|---|---|
| ![Portada](img/galeria/portada.webp) | ![Portada en el teléfono](img/galeria/portada-movil.webp) |
| ![Registro](img/galeria/registro.webp) | ![Registro en el teléfono](img/galeria/registro-movil.webp) |
| ![Directorio de speakers y agenda](img/galeria/directorio.webp) | ![Directorio en el teléfono](img/galeria/directorio-movil.webp) |

| | |
|---|---|
| **Call for Speakers** ![Call for Speakers](img/galeria/speakers.webp) | **Formulario de propuesta** ![Formulario de propuesta](img/galeria/speakers-postular.webp) |
| **Voluntariado** ![Voluntariado](img/galeria/voluntarios.webp) | **Perfil de un speaker** ![Perfil de un speaker](img/galeria/perfil-speaker.webp) |
| **En inglés** ![Portada en inglés](img/galeria/portada-en.webp) | **Página no encontrada** ![404](img/galeria/no-encontrado.webp) |

**Pasaporte digital** — cada asistente presencial tiene uno; los stands lo
sellan con un PIN. En la demo: `/pasaporte/demo00000001`.

<img src="img/galeria/pasaporte-movil.webp" alt="Pasaporte digital en el teléfono" width="300">

**La portada entera:**

<img src="img/galeria/portada-completa.webp" alt="La portada completa" width="420">

## El panel

| | |
|---|---|
| **Inicio**: cifras del evento y cuenta atrás ![Inicio del panel](img/galeria/panel-inicio.webp) | **Asistentes**: filtros, búsqueda, exportes ![Asistentes](img/galeria/panel-registros.webp) |
| **Speakers**: cada propuesta y su etapa ![Speakers](img/galeria/panel-speakers.webp) | **Tarjetas de speakers**: la imagen para redes, editable ![Tarjetas](img/galeria/panel-tarjetas.webp) |
| **Programa**: agenda por salas, con choques marcados ![Programa](img/galeria/panel-programa.webp) | **Voluntarios** ![Voluntarios](img/galeria/panel-voluntarios.webp) |
| **Plantillas de correo** con vista previa ![Plantillas](img/galeria/panel-plantillas.webp) | **Campañas**: plantilla + audiencia ![Campañas](img/galeria/panel-campanas.webp) |
| **Pasaportes**: stands y sus PIN ![Pasaportes](img/galeria/panel-pasaportes.webp) | **Certificados de voluntariado** ![Certificados](img/galeria/panel-certificados.webp) |
| **Cuentas del equipo** y sus permisos ![Cuentas](img/galeria/panel-usuarios.webp) | **Configuración del evento** ![Configuración](img/galeria/panel-config.webp) |

**En el teléfono**, que es como se usa el día del evento:

| Inicio | Asistentes | Check-in |
|---|---|---|
| ![Inicio del panel en el teléfono](img/galeria/panel-inicio-movil.webp) | ![Asistentes en el teléfono](img/galeria/panel-registros-movil.webp) | ![Check-in en el teléfono](img/galeria/panel-check-in-movil.webp) |

## Temas

![Los ocho temas](img/temas.webp)

## Rehacer las capturas

Cuando un cambio altera algo de lo que sale aquí, las capturas se rehacen en el
mismo cambio:

```bash
npm run demo -- --produccion          # en otra terminal; espera a que diga «Ready»
npm run galeria                       # todas (unos 5 minutos)
npm run galeria -- --solo panel-inicio,registro-movil
npm run galeria -- --solo temas       # sólo la hoja de temas
```

Necesita Google Chrome instalado (o `CHROME=/ruta/al/chrome`). La lista de
capturas, con su ruta y su tamaño, está al principio de `scripts/galeria.mjs`;
para añadir una pantalla nueva basta una línea ahí y otra en esta página.
