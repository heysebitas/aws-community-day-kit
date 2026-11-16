/**
 * Los avatares generados (DiceBear, estilo `notionists-neutral`) que salen
 * cuando alguien no tiene foto: en el pasaporte, la confirmación, las vistas
 * previas de los formularios y las tarjetas del equipo.
 *
 * La semilla que elige cada pantalla puede ser un correo o un código de
 * acceso, y la imagen la sirve un tercero. Por eso no se manda tal cual: se
 * pasa antes por una función de un solo sentido. La misma persona sigue
 * teniendo siempre la misma cara, y a DiceBear sólo le llega un número.
 *
 * Son SVG, así que se pintan con `<img>` y no con `next/image`.
 */
const PALETTE = "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";

/** Resumen de 64 bits (cyrb53). No es criptografía; basta para no mandar el dato original. */
function resumen(texto: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${resumen(seed || "anonimo")}&backgroundColor=${PALETTE}`;
}
