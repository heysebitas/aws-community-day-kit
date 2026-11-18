"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { LAND, encuadre, proyectar, type Punto } from "@/lib/globo";
import { acentoCanvas, observarAcento } from "@/lib/tema-canvas";

/**
 * El globo del hero: gira para dejar de frente el punto marcado, se puede
 * arrastrar y al soltarlo vuelve. Canvas 2D a mano, sin motor 3D.
 */
export function WireGlobe({
  marker,
  label,
  descripcion,
  className,
}: {
  marker: Punto;
  label?: string;
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

    const { giro: home, inclinacion } = encuadre(marker);
    let ACENTO = acentoCanvas();
    const dejarDeObservar = observarAcento((v) => { ACENTO = v; pedir(); });

    let raf = 0;
    let spin = home;
    let spinTarget = home;
    let tiltExtra = 0;
    let tiltTarget = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      pedir();
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      spinTarget += (e.clientX - lastX) * 0.006;
      tiltTarget = Math.max(-0.6, Math.min(0.6, tiltTarget + (e.clientY - lastY) * 0.004));
      lastX = e.clientX;
      lastY = e.clientY;
      pedir();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
      canvas.style.cursor = "grab";
      // Vuelve al encuadre por el camino más corto.
      const vueltas = Math.round((spinTarget - home) / (Math.PI * 2));
      spinTarget = home + vueltas * Math.PI * 2;
      tiltTarget = 0;
      pedir();
    };
    canvas.style.cursor = "grab";
    // El gesto vertical sigue siendo scroll de la página; el horizontal gira el globo.
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    // El tamaño se guarda al cambiar: leer `clientWidth` en cada fotograma
    // obliga al navegador a recalcular la maqueta sesenta veces por segundo.
    let size = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      if (!size) return;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    // Sin tamaño no se pide fotograma: al medirse, el observador lo reanuda.
    const observer = new ResizeObserver(() => {
      resize();
      if (visible && size && !raf) raf = requestAnimationFrame(draw);
    });
    observer.observe(canvas);

    // Fuera de pantalla no se dibuja.
    let visible = true;
    const centinela = new IntersectionObserver(([e]) => {
      visible = e!.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) raf = requestAnimationFrame(draw);
    }, { rootMargin: "100px" });
    centinela.observe(canvas);

    const pedir = () => {
      if (visible && size && !raf) raf = requestAnimationFrame(draw);
    };

    const draw = () => {
      if (!visible) {
        raf = 0;
        return;
      }
      if (!size) {
        raf = 0;
        return;
      }
      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.44;
      const tilt = inclinacion + tiltExtra;
      ctx.clearRect(0, 0, size, size);

      const trazar = (puntos: Iterable<[number, number]>) => {
        ctx.beginPath();
        let pen = false;
        for (const [lat, lon] of puntos) {
          const p = proyectar(lat, lon, spin, r, tilt);
          if (p.z < 0) { pen = false; continue; }
          if (!pen) { ctx.moveTo(cx + p.x, cy + p.y); pen = true; }
          else ctx.lineTo(cx + p.x, cy + p.y);
        }
        ctx.stroke();
      };

      // Disco de fondo: separa la esfera del negro.
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ACENTO},0.05)`;
      ctx.fill();

      // Retícula.
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = `rgba(${ACENTO},0.14)`;
      for (let lon = -180; lon < 180; lon += 30) {
        trazar((function* () { for (let lat = -90; lat <= 90; lat += 5) yield [lat, lon] as [number, number]; })());
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        trazar((function* () { for (let lon = -180; lon <= 180; lon += 5) yield [lat, lon] as [number, number]; })());
      }

      // Continentes.
      ctx.lineWidth = 1.4;
      ctx.lineJoin = "round";
      ctx.strokeStyle = `rgba(${ACENTO},0.75)`;
      for (const arc of LAND) {
        trazar((function* () { for (let i = 0; i < arc.length; i += 2) yield [arc[i + 1], arc[i]] as [number, number]; })());
      }

      // Limbo.
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${ACENTO},0.4)`;
      ctx.stroke();

      // Marcador.
      const m = proyectar(marker.lat, marker.lon, spin, r, tilt);
      if (m.z > -0.02) {
        const mx = cx + m.x;
        const my = cy + m.y;
        const t = reduced ? 0.5 : (Date.now() % 1800) / 1800;

        // Anillo que se expande y se apaga.
        ctx.beginPath();
        ctx.arc(mx, my, 5 + t * 22, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${ACENTO},${(1 - t) * 0.8})`;
        ctx.stroke();

        // Retícula de puntería.
        ctx.beginPath();
        ctx.moveTo(mx - 14, my); ctx.lineTo(mx - 6, my);
        ctx.moveTo(mx + 6, my);  ctx.lineTo(mx + 14, my);
        ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my - 6);
        ctx.moveTo(mx, my + 6);  ctx.lineTo(mx, my + 14);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(${ACENTO},0.9)`;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        if (label) {
          ctx.beginPath();
          ctx.moveTo(mx + 10, my - 10);
          ctx.lineTo(mx + 32, my - 32);
          ctx.lineTo(mx + 96, my - 32);
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${ACENTO},0.6)`;
          ctx.stroke();

          ctx.font = "700 12px ui-monospace, SFMono-Regular, monospace";
          ctx.fillStyle = "#FFFFFF";
          ctx.textBaseline = "bottom";
          ctx.fillText(label.toUpperCase(), mx + 34, my - 36);
        }
      }

      spin += (spinTarget - spin) * (dragging ? 0.35 : 0.06);
      tiltExtra += (tiltTarget - tiltExtra) * (dragging ? 0.35 : 0.06);
      // Con movimiento reducido el pulso está quieto: sólo hace falta otro
      // fotograma mientras el globo sigue al arrastre o vuelve a su encuadre.
      const quieto = Math.abs(spinTarget - spin) < 1e-3 && Math.abs(tiltTarget - tiltExtra) < 1e-3;
      raf = reduced && !dragging && quieto ? 0 : requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);

      dejarDeObservar();
      observer.disconnect();
      centinela.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [marker.lat, marker.lon, label, reduced]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={descripcion}
    />
  );
}
