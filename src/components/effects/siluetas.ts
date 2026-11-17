/** Las siluetas de ciudad de la sección de sede, como modelos de alambre. */

export type V3 = [number, number, number];
export type Arista = [number, number];
export type Modelo = { verts: V3[]; edges: Arista[]; /** Vértice donde parpadea la baliza. */ baliza: number };

const SUELO = -2.4;

class Constructor {
  verts: V3[] = [];
  edges: Arista[] = [];

  /** Una torre: anillos cuadrados apilados, unidos por sus esquinas. */
  torre(x: number, z: number, niveles: Array<[alto: number, ancho: number]>): number {
    const inicios: number[] = [];
    for (const [y, w] of niveles) {
      inicios.push(this.verts.length);
      this.verts.push([x - w, y, z - w], [x + w, y, z - w], [x + w, y, z + w], [x - w, y, z + w]);
    }
    for (const s of inicios) for (let i = 0; i < 4; i++) this.edges.push([s + i, s + ((i + 1) % 4)]);
    for (let l = 0; l < inicios.length - 1; l++) {
      for (let i = 0; i < 4; i++) this.edges.push([inicios[l]! + i, inicios[l + 1]! + i]);
    }
    return inicios[inicios.length - 1]!;
  }

  mastil(x: number, z: number, desde: number, hasta: number): number {
    this.verts.push([x, desde, z], [x, hasta, z]);
    this.edges.push([this.verts.length - 2, this.verts.length - 1]);
    return this.verts.length - 1;
  }

  /** Una cordillera al fondo: la cresta y una falda por cada pico. */
  cordillera(picos: Array<[x: number, y: number]>, z = -2.2) {
    const cresta = this.verts.length;
    for (const [x, y] of picos) this.verts.push([x, y, z]);
    for (let i = 0; i < picos.length - 1; i++) this.edges.push([cresta + i, cresta + i + 1]);
    const base = this.verts.length;
    picos.forEach(([x], i) => {
      this.verts.push([x, SUELO, z]);
      this.edges.push([cresta + i, base + i]);
    });
  }

  suelo() {
    const G = 4;
    for (let i = -G; i <= G; i++) {
      this.verts.push([i * 0.9, SUELO, -2.2], [i * 0.9, SUELO, 2.2]);
      this.edges.push([this.verts.length - 2, this.verts.length - 1]);
    }
    for (let j = -2; j <= 2; j++) {
      this.verts.push([-G * 0.9, SUELO, j * 1.1], [G * 0.9, SUELO, j * 1.1]);
      this.edges.push([this.verts.length - 2, this.verts.length - 1]);
    }
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
  return { verts: c.verts, edges: c.edges, baliza };
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

function automatica(ciudad: string): Modelo {
  const r = aleatorio(ciudad.toLowerCase());
  const c = new Constructor();
  const torres = 5 + Math.floor(r() * 3);
  let masAlta = -Infinity;
  let cima: [number, number] = [0, 0];

  for (let i = 0; i < torres; i++) {
    const x = -2.6 + (5.2 * (i + 0.5)) / torres + (r() - 0.5) * 0.3;
    const z = (r() - 0.5) * 1.6;
    const alto = -1 + r() * 2.6;
    const ancho = 0.22 + r() * 0.2;
    const pisos = 2 + Math.floor(r() * 3);
    const afina = r() > 0.5 ? 0.82 : 1;
    const niveles: Array<[number, number]> = [];
    for (let p = 0; p <= pisos; p++) {
      niveles.push([SUELO + ((alto - SUELO) * p) / pisos, ancho * afina ** p]);
    }
    c.torre(x, z, niveles);
    if (alto > masAlta) { masAlta = alto; cima = [x, z]; }
  }

  const baliza = c.mastil(cima[0], cima[1], masAlta, masAlta + 0.5);

  if (r() > 0.35) {
    const picos: Array<[number, number]> = [];
    for (let x = -3.5; x <= 3.5; x += 0.55) picos.push([x, -1.7 + r() * 1.1]);
    c.cordillera(picos);
  }
  c.suelo();
  return { verts: c.verts, edges: c.edges, baliza };
}

export function siluetaDe(nombre: "auto" | "santiago", ciudad: string): Modelo {
  return nombre === "santiago" ? santiago() : automatica(ciudad);
}
