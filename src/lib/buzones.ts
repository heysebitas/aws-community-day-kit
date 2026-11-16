/**
 * Los correos de contacto, codificados para que no viajen en claro.
 *
 * Las direcciones están en `evento/contacto.ts`, que sólo se lee en el
 * servidor. Al navegador llegan en ROT13 y el `mailto:` se arma después de
 * hidratar: en el HTML servido no hay ninguna dirección que un rastreador de
 * spam pueda recoger. Frena a la mayoría, que sólo busca `algo@algo.algo`; no
 * a uno que ejecute JavaScript.
 */

export type Buzon = "general" | "privacidad" | "patrocinios";
export type BuzonesCodificados = Record<Buzon, string>;

/** ROT13 es su propia inversa: la misma función codifica y descodifica. */
export function rot13(value: string): string {
  return value.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

export function codificar(buzones: Record<Buzon, string>): BuzonesCodificados {
  return {
    general: rot13(buzones.general),
    privacidad: rot13(buzones.privacidad),
    patrocinios: rot13(buzones.patrocinios),
  };
}
