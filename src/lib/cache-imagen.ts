import "server-only";

/**
 * Las imágenes generadas (`ImageResponse`) ya dibujadas, en la memoria del
 * proceso. Dibujar una cuesta cientos de milisegundos de CPU; servirla de aquí,
 * casi nada. Tiene tope de entradas y de bytes, y se descarta la menos usada.
 */
export class CacheImagenes {
  private readonly entradas = new Map<string, Promise<Buffer>>();
  private readonly tamanos = new Map<string, number>();
  private bytes = 0;

  constructor(
    private readonly maxEntradas: number,
    private readonly maxBytes: number,
  ) {}

  /** La imagen ya dibujada, si está. La marca como recién usada. */
  leer(clave: string): Promise<Buffer> | undefined {
    const p = this.entradas.get(clave);
    if (p) {
      this.entradas.delete(clave);
      this.entradas.set(clave, p);
    }
    return p;
  }

  /**
   * La imagen de `clave`, dibujándola con `dibujar` si no está. Las peticiones
   * que llegan mientras se dibuja esperan a la misma promesa.
   */
  obtener(clave: string, dibujar: () => Response | Promise<Response>): Promise<Buffer> {
    const ya = this.leer(clave);
    if (ya) return ya;
    const p = (async () => Buffer.from(await (await dibujar()).arrayBuffer()))();
    this.entradas.set(clave, p);
    p.then(
      (buf) => {
        if (this.entradas.get(clave) !== p) return;
        this.tamanos.set(clave, buf.byteLength);
        this.bytes += buf.byteLength;
        this.recortar();
      },
      () => {
        if (this.entradas.get(clave) === p) this.entradas.delete(clave);
      },
    );
    return p;
  }

  /** Quita las claves que empiezan por `prefijo` (versiones viejas de una misma imagen). */
  olvidar(prefijo: string) {
    for (const clave of [...this.entradas.keys()]) if (clave.startsWith(prefijo)) this.quitar(clave);
  }

  private quitar(clave: string) {
    this.entradas.delete(clave);
    this.bytes -= this.tamanos.get(clave) ?? 0;
    this.tamanos.delete(clave);
  }

  private recortar() {
    for (const clave of this.entradas.keys()) {
      if (this.entradas.size <= this.maxEntradas && this.bytes <= this.maxBytes) break;
      // Una que todavía se está dibujando no cuenta bytes: se deja.
      if (this.tamanos.has(clave)) this.quitar(clave);
    }
  }

  get tamano() {
    return { entradas: this.entradas.size, bytes: this.bytes };
  }
}

/** La respuesta para una imagen ya dibujada. */
export function respuestaPng(buf: Buffer, cacheControl: string): Response {
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/png", "Content-Length": String(buf.byteLength), "Cache-Control": cacheControl },
  });
}
