/** Las siluetas de ciudad de la sección de sede, como modelos de alambre. */

export type V3 = [number, number, number];
export type Arista = [number, number];
/** Qué es cada arista, para darle más o menos peso al dibujarla. */
export type TipoArista = "edificio" | "mastil" | "cordillera" | "suelo";
export type Modelo = {
  verts: V3[];
  edges: Arista[];
  /** Un tipo por arista, en el mismo orden que `edges`. */
  tipos: TipoArista[];
  /** Vértice donde parpadea la baliza. */
  baliza: number;
};

const SUELO = -2.4;

/** Un nivel de un prisma: altura, medio ancho en x, medio ancho en z y giro. */
type Nivel = [y: number, wx: number, wz: number, giro?: number];

class Constructor {
  verts: V3[] = [];
  edges: Arista[] = [];
  tipos: TipoArista[] = [];
  private alta = -Infinity;
  private cima: [number, number] = [0, 0];

  private arista(a: number, b: number, tipo: TipoArista = "edificio") {
    this.edges.push([a, b]);
    this.tipos.push(tipo);
  }

  /** Un anillo horizontal de `n` lados; con 4 es un rectángulo. */
  private anillo(x: number, z: number, [y, wx, wz, giro = 0]: Nivel, n: number): number {
    const inicio = this.verts.length;
    const c = Math.cos(giro), s = Math.sin(giro);
    for (let i = 0; i < n; i++) {
      const [a, b] = n === 4
        ? ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const)[i]!
        : [Math.cos((i / n) * Math.PI * 2), Math.sin((i / n) * Math.PI * 2)];
      const px = a * wx, pz = b * wz;
      this.verts.push([x + px * c - pz * s, y, z + px * s + pz * c]);
    }
    for (let i = 0; i < n; i++) this.arista(inicio + i, inicio + ((i + 1) % n));
    return inicio;
  }

  /** Anillos apilados y unidos por sus esquinas; con `riostra`, una diagonal en caras alternas. */
  prisma(x: number, z: number, niveles: Nivel[], n = 4, riostra = false): number {
    let previo = -1;
    for (const nivel of niveles) {
      const inicio = this.anillo(x, z, nivel, n);
      if (previo >= 0) {
        for (let i = 0; i < n; i++) {
          this.arista(previo + i, inicio + i);
          if (riostra && i % 2 === 0) this.arista(previo + i, inicio + ((i + 1) % n));
        }
      }
      previo = inicio;
    }
    return previo;
  }

  /** Une las esquinas del último anillo con un vértice: el remate en punta. */
  punta(x: number, z: number, anillo: number, n: number, y: number) {
    this.verts.push([x, y, z]);
    const t = this.verts.length - 1;
    for (let i = 0; i < n; i++) this.arista(anillo + i, t);
  }

  /** Torre de un solo tipo de anillo cuadrado, como las de siempre. */
  torre(x: number, z: number, niveles: Array<[alto: number, ancho: number]>): number {
    return this.prisma(x, z, niveles.map(([y, w]) => [y, w, w]));
  }

  /** Anota un punto alto: la baliza va sobre el más alto de todos. */
  marcar(x: number, z: number, y: number) {
    if (y > this.alta) { this.alta = y; this.cima = [x, z]; }
  }

  mastil(x: number, z: number, desde: number, hasta: number): number {
    this.verts.push([x, desde, z], [x, hasta, z]);
    this.arista(this.verts.length - 2, this.verts.length - 1, "mastil");
    return this.verts.length - 1;
  }

  /** El mástil de la baliza sobre el punto más alto anotado. */
  balizaEnLaCima(): number {
    return this.mastil(this.cima[0], this.cima[1], this.alta, this.alta + 0.5);
  }

  /** Una cordillera al fondo: la cresta y una falda por cada pico. */
  /** La cámara mira hacia +z: lo que tiene z positiva queda al fondo. */
  cordillera(picos: Array<[x: number, y: number]>, z = 2.2) {
    const cresta = this.verts.length;
    for (const [x, y] of picos) this.verts.push([x, y, z]);
    for (let i = 0; i < picos.length - 1; i++) this.arista(cresta + i, cresta + i + 1, "cordillera");
    const base = this.verts.length;
    picos.forEach(([x], i) => {
      this.verts.push([x, SUELO, z]);
      this.arista(cresta + i, base + i, "cordillera");
    });
  }

  private linea(x1: number, z1: number, x2: number, z2: number) {
    this.verts.push([x1, SUELO, z1], [x2, SUELO, z2]);
    this.arista(this.verts.length - 2, this.verts.length - 1, "suelo");
  }

  /** Retícula del suelo; con `paso` más pequeño es más densa. */
  suelo(paso = 0.9) {
    for (let x = -3.6; x <= 3.6 + 1e-6; x += paso) this.linea(x, -2.2, x, 2.2);
    for (let z = -2.2; z <= 2.2 + 1e-6; z += paso * 1.22) this.linea(-3.6, z, 3.6, z);
  }

  modelo(baliza: number): Modelo {
    return { verts: this.verts, edges: this.edges, tipos: this.tipos, baliza };
  }
}

/** Santiago de Chile: la Gran Torre contra la cordillera de los Andes. */
function santiago(): Modelo {
  const c = new Constructor();
  c.torre(0, 0, [
    [-1.5, 0.42], [-0.9, 0.4], [-0.3, 0.37], [0.3, 0.34], [0.9, 0.31], [1.45, 0.28], [1.7, 0.16], [1.95, 0.1],
  ]);
  const baliza = c.mastil(0, 0, 1.95, 2.45);
  c.cordillera([
    [-3.4, -1.55], [-2.9, -1.15], [-2.4, -1.45], [-1.9, -0.85], [-1.35, -1.25], [-0.8, -0.6], [-0.25, -1.05],
    [0.3, -0.7], [0.85, -1.3], [1.4, -0.9], [1.95, -1.4], [2.5, -1.05], [3.05, -1.5], [3.5, -1.7],
  ]);
  c.suelo();
  return c.modelo(baliza);
}

/** Generador con semilla: la misma ciudad da siempre la misma silueta. */
function aleatorio(semilla: string) {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type TipoEdificio = "escalonada" | "aguja" | "cilindro" | "torcida" | "arriostrada" | "recta" | "losa";

/** Un edificio del tipo pedido. Devuelve la altura de su punto más alto. */
function edificio(c: Constructor, r: () => number, tipo: TipoEdificio, x: number, z: number, alto: number, w: number): number {
  const h = alto - SUELO;
  const pisos = (p: number, ancho: (i: number) => [number, number], giro = 0): Nivel[] =>
    Array.from({ length: p + 1 }, (_, i) => [SUELO + (h * i) / p, ...ancho(i), i * giro] as Nivel);
  switch (tipo) {
    case "escalonada": {
      const a = SUELO + h * 0.5, b = SUELO + h * 0.8;
      c.prisma(x, z, [
        [SUELO, w, w], [a, w, w], [a, w * 0.72, w * 0.72], [b, w * 0.72, w * 0.72], [b, w * 0.46, w * 0.46], [alto, w * 0.46, w * 0.46],
      ]);
      return alto;
    }
    case "aguja": {
      const niveles: Nivel[] = Array.from({ length: 4 }, (_, i) => {
        const k = w * (1 - i * 0.08);
        return [SUELO + (h * 0.82 * i) / 3, k, k];
      });
      c.punta(x, z, c.prisma(x, z, niveles), 4, alto + 0.35);
      return alto + 0.35;
    }
    case "cilindro":
      c.prisma(x, z, pisos(3 + Math.floor(r() * 3), () => [w, w]), 8);
      return alto;
    case "torcida":
      c.prisma(x, z, pisos(7, () => [w * 0.9, w * 0.9], 0.1 + r() * 0.08));
      return alto;
    case "arriostrada":
      c.prisma(x, z, pisos(Math.max(3, Math.round(h / 0.45)), () => [w, w]), 4, true);
      return alto;
    case "losa": {
      const ancho = w * (1.8 + r() * 0.6);
      c.prisma(x, z, pisos(2, () => [ancho, w * 0.7]));
      return alto;
    }
    default: {
      const afina = r() > 0.5 ? 0.88 : 1;
      c.prisma(x, z, pisos(2 + Math.floor(r() * 3), (i) => [w * afina ** i, w * afina ** i]));
      return alto;
    }
  }
}

/**
 * Horizonte con hitos: detrás, seis torres altas de tipos distintos; delante,
 * edificios bajos y anchos que dan escala. La semilla es el nombre de la ciudad.
 */
function automatica(ciudad: string): Modelo {
  const r = aleatorio(ciudad.toLowerCase() + "/skyline");
  const c = new Constructor();
  const altos: TipoEdificio[] = ["escalonada", "aguja", "cilindro", "torcida", "arriostrada", "recta"];
  const bajos: TipoEdificio[] = ["losa", "recta", "cilindro", "escalonada", "losa"];

  // Fisher-Yates con la semilla: cada ciudad reparte los tipos a su manera.
  for (let i = altos.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [altos[i], altos[j]] = [altos[j]!, altos[i]!];
  }
  altos.forEach((tipo, i) => {
    const x = -2.8 + (5.6 * (i + 0.5)) / altos.length + (r() - 0.5) * 0.25;
    const z = 0.85 + (r() - 0.5) * 0.5;
    const y = edificio(c, r, tipo, x, z, -0.3 + r() * 2.1, 0.24 + r() * 0.12);
    c.marcar(x, z, y);
  });
  for (let i = 0; i < 5; i++) {
    const x = -2.6 + (5.2 * (i + 0.5)) / 5 + (r() - 0.5) * 0.4;
    const z = -0.95 + (r() - 0.5) * 0.4;
    edificio(c, r, bajos[Math.floor(r() * bajos.length)]!, x, z, -1.9 + r() * 1.2, 0.2 + r() * 0.1);
  }
  const baliza = c.balizaEnLaCima();

  const picos: Array<[number, number]> = [];
  for (let x = -3.5; x <= 3.5; x += 0.55) picos.push([x, -1.7 + r() * 1.1]);
  c.cordillera(picos);
  c.suelo(0.45);
  return c.modelo(baliza);
}

export function siluetaDe(nombre: "auto" | "santiago", ciudad: string): Modelo {
  return nombre === "santiago" ? santiago() : automatica(ciudad);
}
