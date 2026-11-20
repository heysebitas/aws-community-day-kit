import "server-only";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { pdfToBuffer, registrarMono, type Doc } from "./common";

/**
 * Escarapelas al tamaño exacto de la etiqueta. Todo va en negro sobre blanco
 * porque la impresora térmica sólo imprime negro.
 */

const MM = 72 / 25.4;
const NEGRO = "#000000";
const GRIS = "#444444";
const CORTE = "#bbbbbb";

export type PersonaEscarapela = {
  shortId: string; role: string; firstName: string; lastName: string;
  company?: string; jobTitle?: string; badgeFirstName?: string; badgeLastName?: string;
};
type Align = "left" | "center" | "right";
type Cfg = {
  qrPct: number; fontScale: number; showQr: boolean; showRole: boolean; showCompany: boolean; showJobTitle: boolean;
  alignName: Align; alignJobTitle: Align; alignCompany: Align; alignRole: Align; layout: "side" | "stacked";
};

/** Lo que se guarda en un preset; todo opcional porque puede no haber ninguno. */
export type PresetEscarapela = Partial<Omit<Cfg, "alignName" | "alignJobTitle" | "alignCompany" | "alignRole" | "layout">> & {
  widthMm?: number; heightMm?: number; marginMm?: number; perLabel?: number; rotate?: number;
  layout?: string; alignName?: string; alignJobTitle?: string; alignCompany?: string; alignRole?: string;
};

export type OpcionesEscarapela = {
  /** URL a la que apunta el QR, sin la barra final. */
  sitio: string;
  /** Etiqueta de cada rol, ya en mayúsculas. */
  roles: Record<string, string>;
  titulo: string;
};

/** Valores por defecto: etiqueta de 4×6" con 3 mm de margen. */
export const POR_DEFECTO = { widthMm: 101.6, heightMm: 152.4, marginMm: 3, qrPct: 32 } as const;

const al = (v: unknown): Align => (v === "center" || v === "right" ? v : "left");
const primera = (s?: string) => (s || "").trim().split(/\s+/)[0] || "";

// Helvetica sólo trae WinAnsi (latín occidental). Un nombre con ł, ő o
// caracteres no latinos se escribe con la TTF incrustada, que sí los tiene.
const WIN_ANSI = /^[\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]*$/;

class Lienzo {
  /** Mientras se escribe un nombre que la necesita, todo el nombre va en la TTF: dos fuentes en un nombre se ven rotas. */
  mono = false;

  constructor(readonly pdf: Doc, readonly hayMono: boolean) {}

  fuente(texto: string, negrita: boolean) {
    if (this.hayMono && (this.mono || !WIN_ANSI.test(texto))) return "JetBrains";
    return negrita ? "Helvetica-Bold" : "Helvetica";
  }

  ancho(texto: string, negrita: boolean, size: number, espaciado = 0) {
    return this.pdf.font(this.fuente(texto, negrita)).fontSize(size).widthOfString(texto, { characterSpacing: espaciado });
  }

  /** El mayor tamaño ≤ max con que el texto cabe; si ni con min cabe, null. */
  tamano(texto: string, negrita: boolean, anchoMax: number, max: number, min: number, espaciado = 0): number | null {
    let s = max;
    while (s > min && this.ancho(texto, negrita, s, espaciado) > anchoMax) s -= 0.5;
    return this.ancho(texto, negrita, s, espaciado) <= anchoMax ? s : null;
  }

  /** Recorta con «…» hasta que quepa a ese tamaño. */
  recortar(texto: string, negrita: boolean, anchoMax: number, size: number, espaciado = 0) {
    if (this.ancho(texto, negrita, size, espaciado) <= anchoMax) return texto;
    let t = texto;
    while (t.length > 1 && this.ancho(`${t}…`, negrita, size, espaciado) > anchoMax) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }

  /** Una línea que nunca se sale: baja hasta min y, si no basta, se corta. */
  linea(texto: string, negrita: boolean, x: number, y: number, w: number, max: number, min: number, align: Align, color: string, espaciado = 0) {
    const s = this.tamano(texto, negrita, w, max, min, espaciado) ?? min;
    const t = this.recortar(texto, negrita, w, s, espaciado);
    this.pdf.font(this.fuente(t, negrita)).fontSize(s).fillColor(color)
      .text(t, x, y, { width: w, lineBreak: false, align, characterSpacing: espaciado });
    return s;
  }

  /**
   * QR en vectores (nítido a cualquier tamaño y en térmica) con dos módulos de
   * zona blanca alrededor, dentro del lado pedido.
   */
  qr(texto: string, x: number, y: number, lado: number) {
    const { modules } = QRCode.create(texto, { errorCorrectionLevel: "M" });
    const n = modules.size, zona = 2, m = lado / (n + 2 * zona);
    this.pdf.save().fillColor(NEGRO);
    for (let r = 0; r < n; r++) {
      // Tramos horizontales seguidos en un solo rectángulo: menos costuras y un PDF más ligero.
      for (let c = 0; c < n; c++) {
        if (!modules.get(r, c)) continue;
        let fin = c;
        while (fin + 1 < n && modules.get(r, fin + 1)) fin++;
        this.pdf.rect(x + (c + zona) * m, y + (r + zona) * m, (fin - c + 1) * m, m);
        c = fin;
      }
    }
    this.pdf.fill().restore();
  }
}

type Bloque = { first: string; last: string; role: string; job?: string; company?: string };

function bloque(p: PersonaEscarapela, c: Cfg, roles: Record<string, string>): Bloque {
  return {
    first: (p.badgeFirstName?.trim() || primera(p.firstName)).toUpperCase(),
    last: (p.badgeLastName?.trim() || primera(p.lastName)).toUpperCase(),
    role: c.showRole ? (roles[p.role] ?? String(p.role || "").toUpperCase()) : "",
    job: c.showJobTitle ? p.jobTitle?.trim() || undefined : undefined,
    company: c.showCompany ? p.company?.trim() || undefined : undefined,
  };
}

/**
 * Renglones del nombre a un tamaño: nombre y apellido por separado, partidos
 * en los espacios y después de un guion. Null si alguna palabra no cabe.
 */
function renglones(l: Lienzo, b: Bloque, w: number, s: number): string[] | null {
  const out: string[] = [];
  for (const parte of [b.first, b.last]) {
    let actual = "";
    for (const tok of parte.split(/\s+/).filter(Boolean).flatMap((t) => t.split(/(?<=-)/))) {
      const prueba = actual + (actual && !actual.endsWith("-") ? " " : "") + tok;
      if (!actual || l.ancho(prueba, true, s) <= w) actual = prueba;
      else { out.push(actual); actual = tok; }
    }
    if (actual) out.push(actual);
  }
  return out.every((r) => l.ancho(r, true, s) <= w) ? out : null;
}

const MAX_RENGLONES = 4;
// Con mayúsculas acentuadas (Ó, Á) un interlineado más cerrado pega la tilde al renglón de arriba.
const INTERLINEA = 1.12;

/**
 * El nombre lo más grande posible: primero en sus dos renglones naturales y,
 * si así queda chico, partido en más renglones.
 */
function nombre(l: Lienzo, b: Bloque, w: number, max: number, min: number, alto: (ns: number, n: number) => number, h: number) {
  l.mono = l.hayMono && !(WIN_ANSI.test(b.first) && WIN_ANSI.test(b.last));
  for (let ns = max; ns > min; ns -= 0.5) {
    const r = renglones(l, b, w, ns);
    if (r && r.length <= MAX_RENGLONES && alto(ns, r.length) <= h) return { ns, lineas: r };
  }
  // Ni al mínimo cabe: cada parte en un renglón y linea() la recorta.
  return { ns: min, lineas: [b.first, b.last].filter(Boolean) };
}

const ID_QR = (shortId: string) => shortId.slice(0, 6).toUpperCase(); // el PIN no se imprime: va en el correo

// Lado a lado: nombre a la izquierda, QR a la derecha.
function lado(l: Lienzo, p: PersonaEscarapela, x: number, y: number, w: number, h: number, c: Cfg, o: OpcionesEscarapela) {
  const b = bloque(p, c, o.roles);
  let textW = w;

  if (c.showQr) {
    const qrSize = Math.min(h * 0.78, w * (c.qrPct / 100));
    const idS = Math.max(5, qrSize * 0.09);
    const colH = qrSize + idS + 2;
    const qx = x + w - qrSize, qy = y + Math.max(0, (h - colH) / 2);
    l.qr(`${o.sitio}/pasaporte/${p.shortId}`, qx, qy, qrSize);
    l.linea(ID_QR(p.shortId), false, qx, qy + qrSize + 2, qrSize, idS, 5, "center", GRIS);
    textW = w - qrSize - w * 0.05;
  }

  const alto = (ns: number, n: number) => {
    const info = Math.max(6, ns * 0.32), rol = Math.max(6, ns * 0.3);
    return ns * INTERLINEA * n + (b.job ? info * 1.5 : 0) + (b.company ? info * 1.5 : 0) + (b.role ? rol * 2 : 0);
  };
  const max = Math.max(7, Math.min(((h * 0.5) / (b.last ? 2 : 1)) * c.fontScale, textW * 0.34 * c.fontScale, 200));
  const { ns, lineas } = nombre(l, b, textW, max, 7, alto, h);
  const info = Math.max(6, ns * 0.32), rol = Math.max(6, ns * 0.3);

  let ty = y + Math.max(0, (h - alto(ns, lineas.length)) / 2);
  for (const r of lineas) { l.linea(r, true, x, ty, textW, ns, 6, c.alignName, NEGRO); ty += ns * INTERLINEA; }
  l.mono = false;
  if (b.job) { l.linea(b.job, false, x, ty + 3, textW, info, 5.5, c.alignJobTitle, GRIS); ty += info * 1.5; }
  if (b.company) { l.linea(b.company, false, x, ty + 3, textW, info, 5.5, c.alignCompany, GRIS); ty += info * 1.5; }
  if (b.role) l.linea(b.role, true, x, ty + 5, textW, rol, 5.5, c.alignRole, NEGRO, 0.5);
}

// Apilada: nombre grande arriba a todo el ancho, cargo y empresa, rol y el QR centrado abajo.
function apilada(l: Lienzo, p: PersonaEscarapela, x: number, y: number, w: number, h: number, c: Cfg, o: OpcionesEscarapela) {
  const b = bloque(p, c, o.roles);
  const qrSize = c.showQr ? Math.min(h * 0.42, w * (c.qrPct / 100)) : 0;
  const idS = Math.max(5, qrSize * 0.1);
  const idH = c.showQr ? idS + 2 : 0;

  const medidas = (ns: number, n: number) => {
    const info = Math.max(5.5, ns * 0.3), rol = Math.max(5.5, ns * 0.28), g = ns * 0.3;
    const bh = ns * INTERLINEA * n + (b.job ? info * 1.35 : 0) + (b.company ? info * 1.35 : 0)
      + (b.role ? rol * 1.7 : 0) + (c.showQr ? g + qrSize + idH : 0);
    return { info, rol, g, bh };
  };
  const max = Math.max(8, Math.min(Math.min(w * 0.62, h * 0.55) * c.fontScale, 300));
  const { ns, lineas } = nombre(l, b, w, max, 8, (s, n) => medidas(s, n).bh, h);
  const { info, rol, g, bh } = medidas(ns, lineas.length);

  let ty = y + Math.max(0, (h - bh) / 2);
  for (const r of lineas) { l.linea(r, true, x, ty, w, ns, 6, c.alignName, NEGRO); ty += ns * INTERLINEA; }
  l.mono = false;
  if (b.job) { l.linea(b.job, false, x, ty, w, info, 5.5, c.alignJobTitle, GRIS); ty += info * 1.35; }
  if (b.company) { l.linea(b.company, false, x, ty, w, info, 5.5, c.alignCompany, GRIS); ty += info * 1.35; }
  if (b.role) { l.linea(b.role, true, x, ty, w, rol, 5.5, c.alignRole, NEGRO, 0.5); ty += rol * 1.7; }
  if (c.showQr) {
    ty += g;
    const qx = x + (w - qrSize) / 2;
    l.qr(`${o.sitio}/pasaporte/${p.shortId}`, qx, ty, qrSize);
    l.linea(ID_QR(p.shortId), false, qx, ty + qrSize + 2, qrSize, idS, 5, "center", GRIS);
  }
}

/** El PDF con una página por etiqueta (o dos escarapelas por etiqueta, para cortar). */
export function generarEscarapelas(personas: PersonaEscarapela[], preset: PresetEscarapela | null, o: OpcionesEscarapela): Promise<Buffer> {
  const widthMm = preset?.widthMm ?? POR_DEFECTO.widthMm, heightMm = preset?.heightMm ?? POR_DEFECTO.heightMm;
  const marginMm = preset?.marginMm ?? POR_DEFECTO.marginMm;
  const perLabel = preset?.perLabel === 2 ? 2 : 1;
  const rotate = [90, 180, 270].includes(Number(preset?.rotate)) ? Number(preset?.rotate) : 0;
  const c: Cfg = {
    qrPct: preset?.qrPct ?? POR_DEFECTO.qrPct, fontScale: preset?.fontScale ?? 1,
    showQr: preset?.showQr ?? true, showRole: preset?.showRole ?? true,
    showCompany: preset?.showCompany ?? true, showJobTitle: preset?.showJobTitle ?? true,
    alignName: al(preset?.alignName), alignJobTitle: al(preset?.alignJobTitle),
    alignCompany: al(preset?.alignCompany), alignRole: al(preset?.alignRole),
    layout: preset?.layout === "stacked" ? "stacked" : "side",
  };
  const dibujar = c.layout === "stacked" ? apilada : lado;

  const W = widthMm * MM, H = heightMm * MM, M = marginMm * MM;
  // Con giro de 90/270 se dibuja en el lienzo girado: ancho y alto se intercambian.
  const swap = rotate === 90 || rotate === 270;
  const LW = swap ? H : W, LH = swap ? W : H;
  const pdf = new PDFDocument({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: false, info: { Title: o.titulo } });
  const l = new Lienzo(pdf, registrarMono(pdf));

  const pagina = (dentro: () => void) => {
    pdf.addPage({ size: [W, H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    if (rotate) {
      pdf.save();
      pdf.translate(W / 2, H / 2).rotate(rotate).translate(-LW / 2, -LH / 2);
    }
    dentro();
    if (rotate) pdf.restore();
  };

  if (perLabel === 2) {
    const gap = 4 * MM;
    const halfH = (LH - 2 * M - gap) / 2;
    for (let i = 0; i < personas.length; i += 2) {
      pagina(() => {
        dibujar(l, personas[i]!, M, M, LW - 2 * M, halfH, c, o);
        if (personas[i + 1]) dibujar(l, personas[i + 1]!, M, M + halfH + gap, LW - 2 * M, halfH, c, o);
        const cutY = M + halfH + gap / 2;
        pdf.save().dash(4, { space: 3 }).moveTo(M, cutY).lineTo(LW - M, cutY).lineWidth(0.5).strokeColor(CORTE).stroke().undash().restore();
      });
    }
  } else {
    for (const p of personas) pagina(() => dibujar(l, p, M, M, LW - 2 * M, LH - 2 * M, c, o));
  }
  return pdfToBuffer(pdf);
}

/** Un preset que llega del formulario, con los mismos límites que al guardarlo. */
export function presetDesde(b: Record<string, unknown>): PresetEscarapela {
  const num = (v: unknown, def: number, min: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? n : def;
  };
  const AL = (v: unknown) => (v === "center" || v === "right" ? v : "left");
  return {
    widthMm: num(b.widthMm, POR_DEFECTO.widthMm, 10, 400),
    heightMm: num(b.heightMm, POR_DEFECTO.heightMm, 10, 400),
    marginMm: num(b.marginMm, POR_DEFECTO.marginMm, 0, 30),
    qrPct: num(b.qrPct, POR_DEFECTO.qrPct, 5, 90),
    fontScale: num(b.fontScale, 1, 0.3, 3),
    perLabel: Number(b.perLabel) === 2 ? 2 : 1,
    rotate: [90, 180, 270].includes(Number(b.rotate)) ? Number(b.rotate) : 0,
    layout: b.layout === "stacked" ? "stacked" : "side",
    alignName: AL(b.alignName), alignJobTitle: AL(b.alignJobTitle), alignCompany: AL(b.alignCompany), alignRole: AL(b.alignRole),
    showQr: b.showQr !== false, showRole: b.showRole !== false,
    showCompany: b.showCompany !== false, showJobTitle: b.showJobTitle !== false,
  };
}

/** Dos personas de muestra para la vista previa: un nombre corto y uno que obliga a partir. */
export const MUESTRA: PersonaEscarapela[] = [
  { shortId: "muestra00001", role: "attendee", firstName: "Lucía", lastName: "Peña", jobTitle: "Estudiante de sistemas", company: "Universidad Demo" },
  { shortId: "muestra00002", role: "speaker", firstName: "María Fernanda", lastName: "Rodríguez-Echeverría", badgeFirstName: "María Fernanda", badgeLastName: "Rodríguez-Echeverría",
    jobTitle: "Arquitecta de soluciones en la nube", company: "Universidad Nacional Abierta y a Distancia" },
];
