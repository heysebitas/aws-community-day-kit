# Recursos de tu edición que no se publican

Esta carpeta es para archivos que tu evento necesita y que **no se pueden
redistribuir**. Los PDF que pongas aquí están en `.gitignore`: no se suben.

## El certificado oficial de un AWS Student Community Day

Si tu evento es un SCD (`tipo: "scd"` en `evento/config.ts`), el certificado de
voluntariado se emite sobre la plantilla que el programa AWS Student Builder
Groups entrega a sus líderes. Es material de Amazon, así que no viene en el kit.

1. Pídesela a tu contacto del programa.
2. Guárdala aquí como `certificado-sbg.pdf`, sin editarla.
3. `npm run doctor` te confirma que la encontró.
4. En **Panel → Certificados**, mándate una prueba antes del envío real.

El kit usa la página oscura (la segunda del PDF) y escribe sobre ella el nombre
de la persona, quién organiza, el evento, la fecha y la ciudad.

Sin la plantilla —o si la que pusiste tiene otro formato— sale el certificado
genérico con el tema de tu edición. Nadie se queda sin certificado.

En tu servidor, el archivo tiene que estar también ahí: como no va en git,
cópialo a mano junto con `.env.local`.
