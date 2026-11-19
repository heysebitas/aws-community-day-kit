import "server-only";
import { createHash } from "node:crypto";
import { DOMINIO, EVENTO } from "@/config";
import { armarMime } from "@/lib/correo-mime";

/**
 * Envío de correos.
 *
 * El resto del código llama a `sendEmail` y a `sendEmailBatchDetallado` sin
 * saber quién entrega. El proveedor se elige con `CORREO_PROVEEDOR`:
 *
 *   resend   Resend. Es el que se usa si hay `RESEND_API_KEY` y no se dice otra
 *            cosa. Único con seguimiento de entregas y rebotes (por webhook).
 *   ses      Amazon SES, con las credenciales de AWS del entorno.
 *   consola  No envía: escribe el destinatario y el asunto en el registro. Es
 *            lo que hay cuando no se configuró nada, y en modo demo.
 */

export const EMAIL_FROM = process.env.EMAIL_FROM || `${EVENTO.siglas} ${EVENTO.edicion} <noreply@${DOMINIO}>`;
export const MARKETING_EMAIL_FROM = process.env.MARKETING_EMAIL_FROM || EMAIL_FROM;

interface EmailAttachment {
  filename: string;
  /** En base64. */
  content: string;
}

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  /** Identifica este envío a este destinatario; el proveedor no lo repite si se reintenta. */
  clave?: string;
}

export interface SendEmailResult {
  /** El id que dio el proveedor: con él se atribuye después una entrega o un rebote. */
  id: string | null;
  error: string | null;
}

export type Proveedor = "resend" | "ses" | "consola";

export function proveedor(): Proveedor {
  const pedido = process.env.CORREO_PROVEEDOR?.toLowerCase();
  if (pedido === "resend" || pedido === "ses" || pedido === "consola") return pedido;
  return process.env.RESEND_API_KEY ? "resend" : "consola";
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const fallo = (e: unknown): SendEmailResult => ({ id: null, error: e instanceof Error ? e.message : String(e) });

// ── Resend ───────────────────────────────────────────────────────────────────

const INTENTOS = 3;
const TOPE_ESPERA_MS = 30_000;

/** Lo que dice `Retry-After` (segundos), en ms; `null` si no viene o no se entiende. */
function esperaPedida(res: Response): number | null {
  const v = res.headers.get("retry-after");
  if (v === null || v.trim() === "") return null;
  const seg = Number(v);
  return Number.isFinite(seg) && seg >= 0 ? Math.min(seg * 1000, TOPE_ESPERA_MS) : null;
}

/**
 * Pide a Resend. Ante 429 y 5xx reintenta hasta `INTENTOS` veces, con espera
 * exponencial o la que mande `Retry-After`; la misma `Idempotency-Key` en cada
 * intento evita que un envío que sí salió se mande dos veces.
 */
async function resend(
  ruta: string,
  cuerpo: unknown,
  clave: string = crypto.randomUUID(),
): Promise<{ ok: boolean; json: unknown; status: number }> {
  const base = Number(process.env.CORREO_REINTENTO_MS ?? 1000);
  for (let intento = 1; ; intento++) {
    const res = await fetch(`https://api.resend.com${ruta}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
        "Content-Type": "application/json",
        "Idempotency-Key": clave,
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(Number(process.env.HTTP_TIMEOUT_MS) || 10_000),
    });
    const reintentable = res.status === 429 || res.status >= 500;
    if (!reintentable || intento >= INTENTOS) {
      return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
    }
    await res.body?.cancel().catch(() => {});
    await sleep(esperaPedida(res) ?? Math.min(base * 2 ** (intento - 1), TOPE_ESPERA_MS));
  }
}

const paraResend = ({ from, to, subject, html, attachments }: SendEmailOptions) => ({
  from, to, subject, html, ...(attachments?.length ? { attachments } : {}),
});

async function enviarResend(email: SendEmailOptions): Promise<SendEmailResult> {
  const { ok, json, status } = await resend("/emails", paraResend(email), email.clave);
  const j = json as { id?: string; message?: string };
  return ok && j.id ? { id: j.id, error: null } : { id: null, error: j.message || `Resend respondió ${status}` };
}

/** Un lote de hasta 100. Los ids vuelven en el orden en que se mandaron. */
async function loteResend(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
  // Una clave por lote: sale de las de cada correo, o es nueva si alguno no trae.
  const clave = emails.every((e) => e.clave)
    ? `lote:${createHash("sha256").update(emails.map((e) => e.clave).join("|")).digest("hex")}`
    : undefined;
  const { ok, json, status } = await resend("/emails/batch", emails.map(paraResend), clave);
  if (!ok) {
    const motivo = (json as { message?: string }).message || `Resend respondió ${status}`;
    return emails.map(() => ({ id: null, error: motivo }));
  }
  const ids = (json as { data?: { id?: string }[] }).data ?? [];
  return emails.map((_, k) => (ids[k]?.id ? { id: ids[k].id!, error: null } : { id: null, error: "Resend no devolvió id" }));
}

// ── Amazon SES ───────────────────────────────────────────────────────────────

// Un cliente por proceso; el SDK se importa al primer envío.
let clienteSes: Promise<import("@aws-sdk/client-sesv2").SESv2Client> | null = null;

function sesCliente() {
  clienteSes ??= import("@aws-sdk/client-sesv2").then(
    ({ SESv2Client }) => new SESv2Client({ region: process.env.SES_REGION || process.env.AWS_REGION || "us-east-1" }),
  );
  clienteSes.catch(() => { clienteSes = null; });
  return clienteSes;
}

async function enviarSes(email: SendEmailOptions): Promise<SendEmailResult> {
  const { SendEmailCommand } = await import("@aws-sdk/client-sesv2");
  const cliente = await sesCliente();
  const salida = await cliente.send(
    new SendEmailCommand({
      FromEmailAddress: email.from,
      Destination: { ToAddresses: [email.to] },
      // Crudo siempre: es la única forma que lleva adjuntos en todas las versiones del SDK.
      Content: { Raw: { Data: Buffer.from(armarMime(email), "utf8") } },
      ...(process.env.SES_CONFIGURATION_SET && { ConfigurationSetName: process.env.SES_CONFIGURATION_SET }),
    }),
  );
  return salida.MessageId ? { id: salida.MessageId, error: null } : { id: null, error: "SES no devolvió id" };
}

// ── Consola ──────────────────────────────────────────────────────────────────

function enviarConsola(email: SendEmailOptions): SendEmailResult {
  const adjuntos = email.attachments?.length ? ` (+${email.attachments.length} adjunto)` : "";
  console.log(`[correo] sin proveedor — para: ${email.to} · asunto: ${email.subject}${adjuntos}`);
  return { id: `consola-${crypto.randomUUID()}`, error: null };
}

// ── Lo que usa el resto del código ───────────────────────────────────────────

export async function sendEmail(email: SendEmailOptions): Promise<SendEmailResult> {
  try {
    switch (proveedor()) {
      case "resend": return await enviarResend(email);
      case "ses": return await enviarSes(email);
      default: return enviarConsola(email);
    }
  } catch (e) {
    return fallo(e);
  }
}

/**
 * Manda muchos y devuelve el resultado de cada uno, en el mismo orden.
 *
 * Quien llama empareja por posición, así que un lote que se cae entero deja un
 * error en cada una de sus posiciones en vez de acortar la lista.
 */
export async function sendEmailBatchDetallado(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
  const salida: SendEmailResult[] = new Array(emails.length);

  if (proveedor() !== "resend") {
    for (let i = 0; i < emails.length; i++) {
      salida[i] = await sendEmail(emails[i]!);
      // SES limita por segundo; el ritmo por omisión de una cuenta nueva es 14/s.
      if (proveedor() === "ses") await sleep(90);
    }
    return salida;
  }

  // El lote de Resend ignora los adjuntos sin avisar: esos van de uno en uno.
  let cola: number[] = [];
  const vaciar = async () => {
    for (let i = 0; i < cola.length; i += 100) {
      const tramo = cola.slice(i, i + 100);
      const r = await loteResend(tramo.map((k) => emails[k]!)).catch((e) => tramo.map(() => fallo(e)));
      tramo.forEach((k, j) => { salida[k] = r[j]!; });
    }
    cola = [];
  };

  for (let i = 0; i < emails.length; i++) {
    if (emails[i]!.attachments?.length) {
      await vaciar();
      salida[i] = await sendEmail(emails[i]!);
      await sleep(550); // Resend admite unas dos peticiones por segundo.
    } else {
      cola.push(i);
    }
  }
  await vaciar();

  return salida;
}

export async function sendEmailBatch(emails: SendEmailOptions[]): Promise<{ sentCount: number; failedCount: number }> {
  const res = await sendEmailBatchDetallado(emails);
  const sentCount = res.filter((r) => !r.error).length;
  return { sentCount, failedCount: res.length - sentCount };
}

/**
 * Manda por tramos y espera a que `alTramo` registre cada uno antes de seguir:
 * si la función muere, lo enviado hasta el último tramo ya quedó anotado.
 * Con `limiteMs` no arranca tramos nuevos pasado ese tiempo. Devuelve cuántos
 * correos se procesaron, siempre del principio de la lista.
 */
export async function enviarPorTramos(
  emails: SendEmailOptions[],
  tamano: number,
  alTramo: (inicio: number, resultados: SendEmailResult[]) => Promise<void>,
  limiteMs = Infinity,
): Promise<number> {
  const t0 = Date.now();
  let hechos = 0;
  while (hechos < emails.length && Date.now() - t0 < limiteMs) {
    const tramo = emails.slice(hechos, hechos + tamano);
    const resultados = await sendEmailBatchDetallado(tramo);
    await alTramo(hechos, resultados);
    hechos += tramo.length;
  }
  return hechos;
}

/** Corre `fn` sobre cada elemento con a lo sumo `max` a la vez y `pausaMs` entre uno y otro de cada hilo. */
export async function conConcurrencia<T, R>(
  items: T[],
  max: number,
  fn: (item: T) => Promise<R>,
  pausaMs = 0,
): Promise<PromiseSettledResult<R>[]> {
  const salida: PromiseSettledResult<R>[] = new Array(items.length);
  let siguiente = 0;
  const hilo = async () => {
    while (siguiente < items.length) {
      const i = siguiente++;
      try {
        salida[i] = { status: "fulfilled", value: await fn(items[i]!) };
      } catch (reason) {
        salida[i] = { status: "rejected", reason };
      }
      if (pausaMs) await sleep(pausaMs);
    }
  };
  await Promise.all(Array.from({ length: Math.min(max, items.length) }, hilo));
  return salida;
}
