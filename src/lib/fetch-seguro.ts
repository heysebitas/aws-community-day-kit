import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";

/**
 * Descarga una imagen de una URL que no escribió el equipo.
 *
 * La tarjeta de un speaker incrusta su foto, y esa URL puede venir de un
 * formulario público. Pedirla sin más dejaría que cualquiera hiciera al
 * servidor consultar direcciones internas (el servicio de metadatos de la
 * nube, otros servicios de la red). Por eso:
 *
 *   · sólo https, y sólo el puerto 443;
 *   · el nombre se resuelve antes y se descarta si apunta a una red privada;
 *   · se conecta a esa IP ya comprobada, no se vuelve a resolver;
 *   · cada redirección pasa de nuevo por todo lo anterior;
 *   · con tope de tamaño y de tiempo.
 */

const MAX_BYTES = 12 * 1024 * 1024;
const TIEMPO_MS = 10_000;
const MAX_SALTOS = 3;

/** Redes a las que el servidor no tiene por qué pedirle una foto. */
export function esIpPrivada(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("ff")) return true;
  // IPv4 mapeada: ::ffff:10.0.0.1
  const mapeada = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  return mapeada ? esIpPrivada(mapeada[1]) : false;
}

function pedir(url: URL, ip: string, familia: number): Promise<{ estado: number; ubicacion?: string; tipo: string; cuerpo: Buffer | null }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: url.hostname,
        servername: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: "GET",
        headers: { Accept: "image/*", "User-Agent": "aws-community-day-kit" },
        // La conexión va a la IP que ya se comprobó.
        lookup: (_h, _o, cb) => cb(null, ip, familia),
        timeout: TIEMPO_MS,
      },
      (res) => {
        const estado = res.statusCode ?? 0;
        const tipo = String(res.headers["content-type"] ?? "");
        if (estado >= 300 && estado < 400) {
          res.resume();
          return resolve({ estado, ubicacion: res.headers.location, tipo, cuerpo: null });
        }
        if (estado !== 200) {
          res.resume();
          return resolve({ estado, tipo, cuerpo: null });
        }
        const trozos: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > MAX_BYTES) {
            req.destroy(new Error("demasiado grande"));
            return;
          }
          trozos.push(c);
        });
        res.on("end", () => resolve({ estado, tipo, cuerpo: Buffer.concat(trozos) }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("tiempo agotado")));
    req.on("error", reject);
    req.end();
  });
}

/** La imagen, o `null` si la URL no es aceptable o no respondió con una. Nunca lanza. */
export async function descargarImagen(direccion: string): Promise<{ buf: Buffer; tipo: string } | null> {
  try {
    let url = new URL(direccion);
    for (let salto = 0; salto <= MAX_SALTOS; salto++) {
      if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password) return null;

      const { address, family } = await dns.lookup(url.hostname);
      if (esIpPrivada(address)) return null;

      const r = await pedir(url, address, family);
      if (r.ubicacion) {
        url = new URL(r.ubicacion, url);
        continue;
      }
      if (!r.cuerpo || !r.tipo.startsWith("image/")) return null;
      return { buf: r.cuerpo, tipo: r.tipo };
    }
    return null;
  } catch {
    return null;
  }
}
