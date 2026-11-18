import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SpeakerProfile, type ISpeakerProfile } from "@/models/speaker-profile";
import { EventConfig } from "@/models/event-config";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import QRCode from "qrcode";
import { TarjetaSpeaker, tamanoAutoTitulo, W, H, type SpeakerEntry } from "./_tarjeta";
import { DOMINIO, EVENTO, IDIOMA_BASE, SITIO, TEMA } from "@/config";
import { fechaLarga } from "@/config/fechas";
import { getAuthUser } from "@/lib/auth";
import { descargarImagen } from "@/lib/fetch-seguro";
import { firmaInterna } from "@/lib/speaker-card";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { CacheImagenes, respuestaPng } from "@/lib/cache-imagen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/** La tarjeta del speaker. */


/** El bloque de datos sale del evento. */
const FECHA = fechaLarga(EVENTO.inicio, IDIOMA_BASE);
const SEDE = EVENTO.sede.nombre;
const CIUDAD = EVENTO.sede.localidad;

// Los archivos no cambian mientras corre el servidor: se leen una vez.
const cacheAssets = new Map<string, string>();
function loadAsset(filePath: string, mime: string) {
  let uri = cacheAssets.get(filePath);
  if (uri === undefined) {
    const buf = fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), filePath));
    uri = `data:${mime};base64,${buf.toString("base64")}`;
    cacheAssets.set(filePath, uri);
  }
  return uri;
}

// Las tarjetas ya dibujadas: unos cientos de KB cada una, con tope.
const cache = new CacheImagenes(64, 32 * 1024 * 1024);
const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

let fuenteBuf: ArrayBuffer | undefined;
function cargarFuente(): ArrayBuffer {
  return (fuenteBuf ??= bufferToArrayBuffer(fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "public/fonts/JetBrainsMono-Bold.ttf"))));
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

// ── Fetch remote image → data URL ────────────────────────────────────────────

/** La foto incrustada como data URL, o vacío si no se pudo traer de forma segura. */
async function fetchAsDataUrl(url: string): Promise<string> {
  if (!url) return "";
  const result = await descargarImagen(url);
  if (!result) return "";
  try {
    const jpeg = await sharp(result.buf)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return "";
  }
}

async function generateQR(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    color: { dark: TEMA.acento, light: "#00000000" },
    width: 220, margin: 1, errorCorrectionLevel: "M",
  });
}


// ── Types ─────────────────────────────────────────────────────────────────────

type CoSpeakerData = {
  firstName?: string; lastName?: string;
  role?: string; tagline?: string; company?: string;
  companyLogo?: string; photo?: string;
};


// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limite = rateLimit(`imagen-speaker:${getIp(_request)}`, 120, 10 * 60 * 1000);
  if (!limite.ok) {
    return Response.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limite.retryAfterMs / 1000)) } },
    );
  }

  const { slug } = await params;

  await connectDB();
  const profile = await SpeakerProfile.findOne({ slug }).lean();

  /** Si la tarjeta lleva el dominio. */
  const config = await EventConfig.findOne().select("tarjetaDominio").lean() as
    | { tarjetaDominio?: boolean } | null;
  const conDominio = config?.tarjetaDominio !== false;
  if (!profile) return new Response("Not found", { status: 404 });

  // La tarjeta de una propuesta que todavía no se aceptó sólo la ve el equipo
  // (o la propia aplicación, al guardarla): si no, el título y el nombre de
  // quien postuló quedarían a la vista de cualquiera que adivine el enlace.
  const visible = profile.isPublic || profile.status === "accepted" || profile.status === "scheduled";
  const interna = _request.headers.get("x-firma") === firmaInterna(slug);
  if (!visible && !interna && !(await getAuthUser().catch(() => null))) {
    return new Response("Not found", { status: 404 });
  }

  const isPreview = _request.nextUrl.searchParams.has("preview");
  const storedCardUrl = (profile.cardImageUrl as string | undefined) ?? "";
  if (storedCardUrl && !isPreview) {
    return NextResponse.redirect(storedCardUrl, { status: 302 });
  }

  const dibujar = () => dibujarTarjeta(profile, slug, conDominio, isPreview, _request.nextUrl.searchParams);

  // La vista previa del editor y las propuestas sin aceptar no se guardan ni se
  // dejan cachear fuera: dependen de la sesión o de la consulta.
  if (!visible || isPreview) {
    const response = await dibujar();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Cambia cuando se edita el perfil (updatedAt) o el dominio de la tarjeta.
  const prefijo = `${slug}:`;
  const clave = `${prefijo}${new Date(profile.updatedAt as Date | string | undefined ?? 0).getTime()}:${conDominio ? 1 : 0}`;
  if (!cache.leer(clave)) cache.olvidar(prefijo);
  return respuestaPng(await cache.obtener(clave, dibujar), CACHE_CONTROL);
}

async function dibujarTarjeta(
  profile: ISpeakerProfile,
  slug: string,
  conDominio: boolean,
  isPreview: boolean,
  sp: URLSearchParams,
): Promise<Response> {
  // Co-speakers (max 3 → 4 total)
  const rawCoSpeakers = (profile.coSpeakers as CoSpeakerData[] | undefined) ?? [];
  const coSpeakers = rawCoSpeakers.slice(0, 3);

  // Fetch all photos in parallel
  const photoResults = await Promise.all([
    fetchAsDataUrl((profile.photo as string | undefined) ?? ""),
    fetchAsDataUrl((profile.companyLogo as string | undefined) ?? ""),
    ...coSpeakers.map((cs) => Promise.all([
      fetchAsDataUrl((cs.photo as string | undefined) ?? ""),
      fetchAsDataUrl((cs.companyLogo as string | undefined) ?? ""),
    ])),
  ]);
  const mainPhoto     = photoResults[0] as string;
  const companyLogo   = photoResults[1] as string;
  const coResults     = (photoResults.slice(2) as [string, string][]);

  // Build speaker entries for multi-speaker layout
  const speakers: SpeakerEntry[] = [
    {
      name: (profile.name as string | undefined) ?? "",
      photo: mainPhoto,
      role: (profile.role as string | undefined) ?? "",
      tagline: (profile.tagline as string | undefined) ?? "",
      company: (profile.company as string | undefined) ?? "",
      companyLogo,
    },
    ...coSpeakers.map((cs, i) => ({
      name: [cs.firstName, cs.lastName].filter(Boolean).join(" "),
      photo: coResults[i]?.[0] ?? "",
      role: cs.role ?? "",
      tagline: cs.tagline ?? "",
      company: cs.company ?? "",
      companyLogo: coResults[i]?.[1] ?? "",
    })),
  ];

  const fontData = cargarFuente();
  const awsLogo   = loadAsset("public/images/logos/aws-logo.svg", "image/svg+xml");
  const mascota = EVENTO.marca.mascota;
  const eventLogo = mascota ? loadAsset(`public${mascota}`, mascota.endsWith(".svg") ? "image/svg+xml" : "image/png") : "";

  const profileUrl = `${SITIO}/speakers/${slug}`;
  const qrDataUrl  = await generateQR(profileUrl);

  // Canvas editor overrides — only applied in single-speaker mode
  const qTitle = isPreview && sp.has("titleCard")  ? sp.get("titleCard")!         : null;
  const qRole  = isPreview && sp.has("roleCard")   ? sp.get("roleCard")!          : null;
  const qCX    = isPreview && sp.has("contentX")   ? Number(sp.get("contentX"))   : null;
  const qCY    = isPreview && sp.has("contentY")   ? Number(sp.get("contentY"))   : null;
  const qNO    = isPreview && sp.has("nameOffset") ? Number(sp.get("nameOffset")) : null;
  const qTS    = isPreview && sp.has("titleSize")  ? Number(sp.get("titleSize"))  : null;
  const qNS    = isPreview && sp.has("nameSize")   ? Number(sp.get("nameSize"))   : null;
  const qFX    = isPreview && sp.has("fotoX")      ? Number(sp.get("fotoX"))      : null;
  const qFY    = isPreview && sp.has("fotoY")      ? Number(sp.get("fotoY"))      : null;
  const qFZ    = isPreview && sp.has("fotoZoom")   ? Number(sp.get("fotoZoom"))   : null;

  const speakerLine = qRole ?? (
    (profile.roleCard as string | undefined) ||
    (profile.tagline as string | undefined) ||
    [profile.role as string | undefined, profile.company as string | undefined].filter(Boolean).join(" · ")
  );
  const title = (qTitle ?? ((profile.talkTitleCard as string | undefined) || (profile.talkTitle as string | undefined))) ?? "";

  // Single-speaker canvas controls
  const contentX   = qCX ?? (profile.cardContentX   as number | undefined) ?? 530;
  const contentY   = qCY ?? (profile.cardContentY   as number | undefined) ?? 180;
  const nameOffset = qNO ?? (profile.cardNameOffset  as number | undefined) ?? 532;
  const titleSize  = qTS ?? (profile.cardTitleSize as number | null | undefined) ?? tamanoAutoTitulo(title);
  const nameSize   = qNS ?? (profile.cardNameSize  as number | undefined) ?? 40;

  const response = new ImageResponse(
    (
      <TarjetaSpeaker
        speakers={speakers}
        title={title}
        speakerLine={speakerLine}
        track={(profile.track as string | undefined) ?? "general"}
        fecha={FECHA}
        sede={SEDE}
        ciudad={CIUDAD}
        dominio={conDominio ? DOMINIO : ""}
        awsLogo={awsLogo}
        eventLogo={eventLogo}
        qrDataUrl={qrDataUrl}
        contentX={contentX}
        contentY={contentY}
        nameOffset={nameOffset}
        titleSize={titleSize}
        nameSize={nameSize}
        fotoX={qFX ?? (profile.cardPhotoX as number | undefined) ?? 50}
        fotoY={qFY ?? (profile.cardPhotoY as number | undefined) ?? 50}
        fotoZoom={qFZ ?? (profile.cardPhotoZoom as number | undefined) ?? 1}
      />
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: "JetBrainsMono", data: fontData, weight: 700, style: "normal" }],
    },
  );

  return response;
}
