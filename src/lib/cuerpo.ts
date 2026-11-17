/**
 * El cuerpo de las peticiones, leído con cabeza.
 *
 * Un valor del cuerpo no puede pasar a un filtro de Mongo sin ser texto:
 * `{"$ne":null}` marcaría presente al primero que encuentre. Por eso
 * `textoDe` exige texto y una longitud razonable, y `leerCuerpo` no lanza
 * cuando lo que llega no es JSON.
 */

/** El cuerpo de una petición, como objeto plano. */
export type Cuerpo = Record<string, unknown>;

/** El cuerpo JSON de la petición; si no es un objeto, uno vacío. */
export async function leerCuerpo(request: Request): Promise<Cuerpo> {
  try {
    const crudo: unknown = await request.json();
    if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return {};
    return crudo as Cuerpo;
  } catch {
    return {};
  }
}

/**
 * Un campo del cuerpo como texto corto.
 * `null` si no es texto, si está vacío o si es más largo de lo previsto.
 */
export function textoDe(cuerpo: Cuerpo, campo: string, maximo = 64): string | null {
  const valor = cuerpo[campo];
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio || limpio.length > maximo) return null;
  return limpio;
}

/** Un campo del cuerpo como texto corto y opcional; `""` si no viene o no es texto. */
export function textoOpcional(cuerpo: Cuerpo, campo: string, maximo = 200): string {
  return textoDe(cuerpo, campo, maximo) ?? "";
}

/** Una lista de textos; `null` si no es un arreglo o algún elemento no es texto. */
export function listaDeTextos(valor: unknown): string[] | null {
  if (!Array.isArray(valor) || valor.some((x) => typeof x !== "string")) return null;
  return valor as string[];
}
