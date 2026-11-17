"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  /** Sin efecto: la entrada es un encendido en el sitio, no un recorrido. */
  from?: "up" | "left" | "right" | "scale";
  /** Sin efecto, por la misma razón. */
  distance?: number;
  /** Lo que se ve al cargar no espera al scroll: sin opacity:0 en el HTML. */
  inmediato?: boolean;
}

/**
 * Entrada de las secciones: se enciende como un letrero (dos parpadeos y fijo),
 * sin desplazarse. Sin JS o con movimiento reducido el contenido ya está visible
 * (ver `.scroll-reveal` en globals.css).
 */
export function ScrollReveal({ children, delay = 0, className, inmediato }: ScrollRevealProps) {
  if (inmediato) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: [0, 1, 0.35, 1, 0.7, 1] }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay, times: [0, 0.2, 0.35, 0.55, 0.7, 1], ease: "linear" }}
      className={cn("scroll-reveal", className)}
    >
      {children}
    </motion.div>
  );
}
