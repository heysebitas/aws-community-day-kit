import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  /** Sin efecto: la línea de tiempo de vista no admite retardo. */
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
 * sin desplazarse, con CSS (`animation-timeline: view()`). Sin JS o con movimiento reducido el contenido ya está visible
 * (ver `.scroll-reveal` en globals.css).
 */
export function ScrollReveal({ children, className, inmediato }: ScrollRevealProps) {
  if (inmediato) return <div className={className}>{children}</div>;
  return (
    <div className={cn("scroll-reveal", className)}>{children}</div>
  );
}
