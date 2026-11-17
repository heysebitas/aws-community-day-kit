/**
 * Arma un correo en formato MIME, para los proveedores que lo piden crudo
 * (Amazon SES cuando hay adjuntos).
 */

export interface PartesDeCorreo {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}

const CRLF = "\r\n";

/** Base64 en renglones de 76 caracteres, como exige el estándar. */
const renglones = (base64: string) => base64.replace(/(.{76})/g, `$1${CRLF}`).trimEnd();

/** Cabecera con caracteres fuera de ASCII (un asunto con tildes), en «encoded-word». */
export function cabecera(texto: string): string {
   
  if (/^[\x00-\x7F]*$/.test(texto)) return texto.replace(/[\r\n]+/g, " ");
  return `=?UTF-8?B?${Buffer.from(texto.replace(/[\r\n]+/g, " "), "utf8").toString("base64")}?=`;
}

/** «Nombre <correo@dominio>» con el nombre codificado si hace falta. */
export function direccion(valor: string): string {
  const m = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(valor);
  if (!m) return valor.replace(/[\r\n]+/g, "").trim();
  const nombre = m[1]!.replace(/^"|"$/g, "");
  return nombre ? `${cabecera(nombre)} <${m[2]!.trim()}>` : m[2]!.trim();
}

const TIPOS: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  ics: "text/calendar",
};

export function armarMime({ from, to, subject, html, attachments = [] }: PartesDeCorreo, frontera?: string): string {
  const b = frontera ?? `==cdk_${crypto.randomUUID().replace(/-/g, "")}`;

  const cuerpo = [
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    "",
    renglones(Buffer.from(html, "utf8").toString("base64")),
  ].join(CRLF);

  const cabeceras = [
    `From: ${direccion(from)}`,
    `To: ${direccion(to)}`,
    `Subject: ${cabecera(subject)}`,
    `MIME-Version: 1.0`,
  ];

  if (!attachments.length) return [...cabeceras, cuerpo].join(CRLF) + CRLF;

  const adjuntos = attachments.map(({ filename, content }) => {
    const nombre = filename.replace(/["\r\n]/g, "");
    const tipo = TIPOS[nombre.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
    return [
      `--${b}`,
      `Content-Type: ${tipo}; name="${nombre}"`,
      `Content-Disposition: attachment; filename="${nombre}"`,
      `Content-Transfer-Encoding: base64`,
      "",
      renglones(content.replace(/\s+/g, "")),
    ].join(CRLF);
  });

  return [
    ...cabeceras,
    `Content-Type: multipart/mixed; boundary="${b}"`,
    "",
    `--${b}`,
    cuerpo,
    ...adjuntos,
    `--${b}--`,
    "",
  ].join(CRLF);
}
