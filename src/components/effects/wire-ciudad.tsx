"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { acentoCanvas, observarAcento } from "@/lib/tema-canvas";
import { siluetaDe, type TipoArista } from "./siluetas";

/** Escalones de opacidad: cada uno se traza de una vez. */
const NIVELES = 10;
/** Opacidad de cada tipo de arista: [lejos, cuánto sube al acercarse]. */
const PESO: Record<TipoArista, [number, number]> = {
  edificio: [0.12, 0.72],
  mastil: [0.12, 0.72],
  cordillera: [0.08, 0.45],
  suelo: [0.05, 0.3],
};

/**
 * Una silueta de ciudad en alambre, girando despacio. El puntero la inclina.
 * Los modelos están en `siluetas.ts`.
 */
export function WireCiudad({
  silueta,
  ciudad,
  descripcion,
  className,
}: {
  silueta: "auto" | "santiago";
  ciudad: string;
  /** Texto para lectores de pantalla; viene de `messages`. */
  descripcion?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { verts, edges, tipos, baliza } = siluetaDe(silueta, ciudad);
    // Espacio reutilizado entre fotogramas.
    const px = new Float32Array(verts.length);
    const py = new Float32Array(verts.length);
    const pd = new Float32Array(verts.length);
    const grupos: number[][] = Array.from({ length: 2 * NIVELES }, () => []);
    let ACENTO = acentoCanvas();
    const dejarDeObservar = observarAcento((v) => { ACENTO = v; pedir(); });
    let raf = 0;
    let angle = 0.6;
    const camZ = 7.5;

    // Proyección sin escala ni centro: se aplican al dibujar.
    const proyectar = ([x, y, z]: (typeof verts)[number], ang: number, pit: number) => {
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const cosP = Math.cos(pit), sinP = Math.sin(pit);
      const x1 = x * cosA - z * sinA;
      const z1 = x * sinA + z * cosA;
      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;
      const f = 6 / Math.max(camZ + z2, 0.1);
      return { x: x1 * f, y: -y2 * f, depth: z2 };
    };

    const mascara = "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)";
    canvas.style.maskImage = mascara;
    canvas.style.setProperty("-webkit-mask-image", mascara);
    let targetPitch = 0.12;
    let pitch = 0.12;

    // Fuera de pantalla no se lee la maqueta en cada movimiento del puntero.
    // Con movimiento reducido la ciudad no sigue al puntero.
    const onPointer = (e: PointerEvent) => {
      if (!visible) return;
      const rect = canvas.getBoundingClientRect();
      targetPitch = 0.12 + ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
    };
    if (!reduced) window.addEventListener("pointermove", onPointer, { passive: true });

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    // Sin tamaño no se pide fotograma: al medirse, el observador lo reanuda.
    const observer = new ResizeObserver(() => {
      resize();
      if (visible && w && h && !raf) raf = requestAnimationFrame(draw);
    });
    observer.observe(canvas);

    let visible = true;
    const centinela = new IntersectionObserver(([e]) => {
      visible = e!.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(draw);
    }, { rootMargin: "100px" });
    centinela.observe(canvas);

    const pedir = () => {
      if (visible && w && h && !raf) raf = requestAnimationFrame(draw);
    };

    const draw = () => {
      if (!visible) {
        raf = 0;
        return;
      }
      if (!w || !h) {
        raf = 0;
        return;
      }
      ctx.clearRect(0, 0, w, h);
      pitch += (targetPitch - pitch) * 0.05;

      // Encuadre amplio a propósito: al girar, la ciudad se sale por los lados y
      // ahí se desvanece con la máscara; abajo queda aire para que se vea el suelo.
      const cx = w / 2;
      const cy = h * 0.47;
      const scale = Math.min(w, h) * 0.27;
      for (let i = 0; i < verts.length; i++) {
        const p = proyectar(verts[i]!, angle, pitch);
        px[i] = cx + p.x * scale;
        py[i] = cy + p.y * scale;
        pd[i] = p.depth;
      }

      // A menos profundidad, más cerca: más opaco y grueso, y eso da el volumen.
      // El corte de lo grueso deja fina sólo la cordillera del fondo.
      // Las aristas se agrupan por opacidad y grosor para trazar cada grupo de
      // una vez, sin ordenar ni crear un color por arista en cada fotograma.
      for (let k = 0; k < edges.length; k++) {
        const [a, b] = edges[k]!;
        const d = (pd[a]! + pd[b]!) / 2;
        const cerca = Math.min(1, Math.max(0, (3.2 - d) / 5.4));
        const [base, rango] = PESO[tipos[k]!];
        const nivel = Math.min(NIVELES - 1, Math.floor((base + cerca * rango) * NIVELES));
        const grueso = d < 1.2 && tipos[k] !== "suelo" ? 1 : 0;
        grupos[grueso * NIVELES + nivel]!.push(px[a]!, py[a]!, px[b]!, py[b]!);
      }
      for (let g = 0; g < grupos.length; g++) {
        const lineas = grupos[g]!;
        if (!lineas.length) continue;
        ctx.beginPath();
        for (let j = 0; j < lineas.length; j += 4) {
          ctx.moveTo(lineas[j]!, lineas[j + 1]!);
          ctx.lineTo(lineas[j + 2]!, lineas[j + 3]!);
        }
        ctx.strokeStyle = `rgba(${ACENTO},${((g % NIVELES) + 0.5) / NIVELES})`;
        ctx.lineWidth = g >= NIVELES ? 1.35 : 0.8;
        ctx.stroke();
        lineas.length = 0;
      }

      const lx = px[baliza]!, ly = py[baliza]!;
      const t = reduced ? 0.5 : (Date.now() % 1400) / 1400;
      ctx.beginPath();
      ctx.arc(lx, ly, 2 + t * 9, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ACENTO},${(1 - t) * 0.8})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      // Con movimiento reducido es un dibujo fijo: se repinta sólo al verse,
      // al cambiar de tamaño o de acento.
      if (reduced) {
        raf = 0;
        return;
      }
      angle += 0.0022;
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);

      dejarDeObservar();
      observer.disconnect();
      centinela.disconnect();
      window.removeEventListener("pointermove", onPointer);
    };
  }, [silueta, ciudad, reduced]);

  return <canvas ref={canvasRef} className={className} role="img" aria-label={descripcion} />;
}
