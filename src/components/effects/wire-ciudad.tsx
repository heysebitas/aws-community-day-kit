"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { acentoCanvas } from "@/lib/tema-canvas";
import { siluetaDe } from "./siluetas";

/**
 * Una silueta de ciudad en alambre, girando despacio. El puntero la inclina.
 * Los modelos están en `siluetas.ts`.
 */
export function WireCiudad({
  silueta,
  ciudad,
  className,
}: {
  silueta: "auto" | "santiago";
  ciudad: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { verts, edges, baliza } = siluetaDe(silueta, ciudad);
    const ACENTO = acentoCanvas();
    let raf = 0;
    let angle = 0.6;
    let targetPitch = 0.12;
    let pitch = 0.12;

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetPitch = 0.12 + ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

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
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let visible = true;
    const centinela = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "100px" });
    centinela.observe(canvas);

    const draw = () => {
      if (!w || !h || !visible) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      pitch += (targetPitch - pitch) * 0.05;

      const cx = w / 2;
      const cy = h * 0.56;
      const scale = Math.min(w, h) * 0.29;
      const camZ = 7.5;
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

      const proj = verts.map(([x, y, z]) => {
        const x1 = x * cosA - z * sinA;
        const z1 = x * sinA + z * cosA;
        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;
        const f = 6 / Math.max(camZ + z2, 0.1);
        return { x: cx + x1 * f * scale, y: cy - y2 * f * scale, depth: z2 };
      });

      // Las aristas lejanas primero y más tenues: eso da la profundidad.
      const orden = edges
        .map((e, i) => ({ i, d: (proj[e[0]].depth + proj[e[1]].depth) / 2 }))
        .sort((a, b) => a.d - b.d);

      for (const { i, d } of orden) {
        const [a, b] = edges[i];
        const alpha = 0.16 + Math.max(0, (d + 2.6) / 5.2) * 0.7;
        ctx.beginPath();
        ctx.moveTo(proj[a].x, proj[a].y);
        ctx.lineTo(proj[b].x, proj[b].y);
        ctx.strokeStyle = `rgba(${ACENTO},${Math.min(alpha, 0.9)})`;
        ctx.lineWidth = d > 0 ? 1.3 : 0.8;
        ctx.stroke();
      }

      const luz = proj[baliza];
      if (luz) {
        const t = reduced ? 0.5 : (Date.now() % 1400) / 1400;
        ctx.beginPath();
        ctx.arc(luz.x, luz.y, 2 + t * 9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ACENTO},${(1 - t) * 0.8})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(luz.x, luz.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
      }

      if (!reduced) angle += 0.0022;
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      centinela.disconnect();
      window.removeEventListener("pointermove", onPointer);
    };
  }, [silueta, ciudad, reduced]);

  return <canvas ref={canvasRef} className={className} role="img" aria-label={`Silueta de ${ciudad} en alambre`} />;
}
