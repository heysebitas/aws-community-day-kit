import { cn } from "@/lib/utils";
import type { Tone } from "./block-section";

/**
 * Cinta a sangre con un texto que se repite y se desplaza en loop. Cada dos
 * repeticiones la caja se invierte (fondo sólido del color contrario), que es
 * el truco de Platanus para que la cinta lata en vez de sólo correr.
 */
export function MarqueeStrip({
  text,
  tone = "ink",
  repeat = 6,
  duration = 28,
  reverse = false,
  alternate = true,
  className,
}: {
  text: string;
  /** Repeticiones por tanda. Se pintan dos tandas para cerrar el loop. */
  repeat?: number;
  tone?: Tone;
  /** Segundos que tarda una vuelta completa. */
  duration?: number;
  reverse?: boolean;
  /** Invierte una de cada dos cajas. */
  alternate?: boolean;
  className?: string;
}) {
  const items = Array.from({ length: repeat * 2 }, (_, i) => i);

  return (
    <div
      className={cn(
        "w-full overflow-hidden border-y",
        tone === "block"
          ? "border-tinta/20 bg-acento text-tinta"
          : "border-surface-700 bg-surface-900 text-acento",
        className,
      )}
      aria-hidden="true"
    >
      <div
        className="flex w-max shrink-0 items-center"
        style={{
          animation: `${reverse ? "marquee-reverse" : "marquee"} ${duration}s linear infinite`,
        }}
      >
        {items.map((i) => {
          const inverted = alternate && i % 2 === 1;
          return (
            <span
              key={i}
              className={cn(
                "dot-matrix whitespace-nowrap px-6 py-3 text-xl leading-none sm:text-2xl md:text-3xl",
                inverted &&
                  (tone === "block"
                    ? "bg-tinta text-acento"
                    : "bg-acento text-tinta"),
              )}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
