"use client";

import { useEffect, useState } from "react";
import { useScroll, motion, useSpring } from "motion/react";

const ESTILO = {
  background: "linear-gradient(90deg, var(--color-acento), var(--color-acento))",
};

// Firefox y Safari 16 no tienen `animation-timeline`: ahí queda Motion.
const soportaLineaDeTiempo = () =>
  typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");

function BarraMotion() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="scroll-progress-bar fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
      style={{ scaleX, ...ESTILO }}
    />
  );
}

export function ScrollProgress() {
  const [css, setCss] = useState<boolean | null>(null);
  useEffect(() => setCss(soportaLineaDeTiempo()), []);
  if (css === null) return null;
  if (!css) return <BarraMotion />;
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
