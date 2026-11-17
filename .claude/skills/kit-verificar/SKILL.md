---
name: kit-verificar
description: "Úsala cuando quieras dar por terminado un cambio del kit: comprueba tipos, lint, pruebas, build y la vista de las páginas tocadas."
---

# Verificar un cambio del kit

## Pasos

1. Mira el diff y enumera las páginas de `src/app/[locale]/` afectadas. Si el cambio es sólo de API o de infraestructura, deja constancia de que no hay una captura de interfaz que revisar.
2. Ejecuta la comprobación completa:

   ```bash
   npm run check
   ```

   Si falla, el veredicto es **NO APTO**. Copia los fallos concretos —tipo, lint o prueba— y no declares apto un cambio con una comprobación rota.
3. Si `npm run check` pasa, genera el build de producción:

   ```bash
   npm run build
   ```

   Un build fallido también da **NO APTO**.
4. Para cambios visibles, levanta la demo sin tocar una base real:

   ```bash
   npm run demo
   ```

5. Con el servidor levantado, captura cada página tocada. `scripts/captura.mjs` necesita Chrome y escribe una imagen PNG completa:

   ```bash
   node scripts/captura.mjs http://localhost:3000/ captura-portada.png
   node scripts/captura.mjs http://localhost:3000/ruta-tocada captura-ruta.png
   ```

   Sustituye la segunda ruta y los nombres de salida por los del cambio. Mira cada imagen y fíjate también en los errores de consola que indique el script.
6. Detén la demo al terminar. No subas las capturas ni otros archivos generados al repositorio.

## Comprobación final

El veredicto tiene que ser uno de estos:

- **APTO**: `npm run check` y `npm run build` terminan con código 0; todas las capturas exigidas existen y se ven bien, sin errores de consola.
- **NO APTO**: falla cualquiera de las comprobaciones o una captura muestra un defecto. Enumera cada fallo concreto y la forma de corregirlo.

En una rama limpia y con el entorno disponible, el resultado esperado es **APTO**.
