"use client";

import { useEffect, useRef, useState } from "react";

const ESTILO = {
  background: "linear-gradient(90deg, var(--color-acento), var(--color-acento))",
};

// Firefox y Safari 16 no tienen `animation-timeline`: ahí se actualiza al hacer scroll.
const soportaLineaDeTiempo = () =>
  typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");

function BarraScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const act = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    act();
    window.addEventListener("scroll", act, { passive: true });
    return () => window.removeEventListener("scroll", act);
  }, []);
  return (
    <div
      ref={ref}
      className="scroll-progress-bar fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
      style={{ transform: "scaleX(0)", ...ESTILO }}
    />
  );
}

export function ScrollProgress() {
  const [css, setCss] = useState<boolean | null>(null);
  useEffect(() => setCss(soportaLineaDeTiempo()), []);
  if (css === null) return null;
  if (!css) return <BarraScroll />;
  return (
    <>
      <style>{"@keyframes progreso-scroll{to{transform:scaleX(1)}}"}</style>
      <div
        className="scroll-progress-bar fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
        style={{
          ...ESTILO,
          transform: "scaleX(0)",
          animation: "progreso-scroll linear both",
          animationTimeline: "scroll(root block)",
        }}
      />
    </>
  );
}
