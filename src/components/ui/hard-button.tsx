import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Tone } from "./block-section";

type Variant = "solid" | "outline";

/**
 * Botón rectangular, sin radio. Platanus abandonó las pills: ahora son cajas
 * duras con un subtítulo opcional adentro ("APLICA CON TU EQUIPO / aplicaciones
 * cerradas"). El desplazamiento en hover imita el shadow-offset de su arcade.
 */
export function HardButton({
  href,
  onClick,
  children,
  sub,
  tone = "ink",
  variant = "solid",
  external,
  disabled,
  pulse,
  className,
}: {
  /** A dónde lleva. Se omite cuando la acción la resuelve `onClick`. */
  href?: string;
  /** Acción en vez de destino: pinta un `<button>`. */
  onClick?: () => void;
  children: React.ReactNode;
  /** Línea chica bajo la etiqueta, dentro de la misma caja. */
  sub?: string;
  tone?: Tone;
  variant?: Variant;
  external?: boolean;
  disabled?: boolean;
  /** Anillo que late alrededor del botón. Sólo en el CTA principal de cada
   *  pantalla — si laten todos, no destaca ninguno. */
  pulse?: boolean;
  className?: string;
}) {
  const base =
    "group inline-flex flex-col items-center justify-center px-8 py-4 text-center transition-all duration-200 active:translate-x-0 active:translate-y-0 active:shadow-none";

  const solid =
    tone === "block"
      ? "bg-tinta text-acento shadow-[5px_5px_0_0_rgba(10,10,15,0.35)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_rgba(10,10,15,0.35)]"
      : "bg-acento text-tinta shadow-[5px_5px_0_0_var(--color-acento-fuerte)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_var(--color-acento-fuerte)]";

  const outline =
    tone === "block"
      ? "border-2 border-tinta text-tinta hover:bg-tinta hover:text-acento"
      : "border-2 border-acento text-acento hover:bg-acento hover:text-tinta";

  const off = "cursor-not-allowed opacity-50 shadow-none hover:translate-x-0 hover:translate-y-0";

  const cls = cn(
    base,
    variant === "solid" ? solid : outline,
    pulse && !disabled && "animate-pulse-highlight",
    disabled && off,
    className,
  );

  const inner = (
    <>
      <span className="dot-matrix text-lg leading-none md:text-xl">{children}</span>
      {sub && (
        <span className="dot-matrix mt-1.5 text-[11px] leading-none opacity-70">
          {sub}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <span className={cls} aria-disabled="true">
        {inner}
      </span>
    );
  }

  if (!href) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }

  // Enlaces externos y anclas van en <a>; las rutas internas en <Link> para
  // conservar la navegación del cliente.
  if (external || href.startsWith("#") || href.startsWith("http")) {
    return (
      <a
        href={href}
        className={cls}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
