"use client";

import { motion } from "motion/react";
import { DotHeading } from "@/components/ui/dot-heading";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Cáscara compartida por los formularios públicos (/registro, /voluntarios,
 * /speakers): bloque del tema a sangre, tinta negra y la hoja del formulario
 * como una caja dura.
 */
export function FormShell({
  title,
  lead,
  children,
  preview,
  aside,
  className,
}: {
  /** Va en el letrero dot-matrix. */
  title: string;
  /** Línea de contexto bajo el letrero. */
  lead?: string;
  children: React.ReactNode;
  /** Tarjeta que se pinta en vivo al lado del formulario (sólo en pantalla ancha). */
  preview?: React.ReactNode;
  /** Contenido opcional a la derecha del letrero (idioma, pasos…). */
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="form-block flex min-h-screen flex-col bg-acento pt-28">
      <div className={cn("mx-auto w-full max-w-6xl flex-1 px-5", className)}>
        {/* Cabecera */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="mb-8 flex flex-wrap items-end justify-between gap-6"
        >
          <div>
            <DotHeading tone="block" variant="inverted" flicker reveal={false}>
              {title}
            </DotHeading>
            {lead && (
              <p className="mt-4 max-w-[48ch] font-mono text-sm leading-relaxed text-tinta/75">
                {lead}
              </p>
            )}
          </div>
          {aside}
        </motion.div>

        <div
          className={cn(
            "grid gap-10 pb-20",
            preview ? "lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12" : "max-w-3xl",
          )}
        >
          {/* Hoja del formulario */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease }}
            className="border-2 border-tinta p-5 shadow-[8px_8px_0_0_var(--color-tinta)] sm:p-8"
          >
            {children}
          </motion.div>

          {/* Preview: acompaña el scroll mientras se llena */}
          {preview && (
            <div className="hidden lg:block">
              <div className="sticky top-28">{preview}</div>
            </div>
          )}
        </div>
      </div>

      {/* Cinta al pie: cierra la sección en vez de estrangular el navbar */}
      <div className="overflow-hidden border-t-2 border-tinta/25" aria-hidden="true">
        <div
          className="flex w-max items-center"
          style={{ animation: "marquee 34s linear infinite" }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "dot-matrix whitespace-nowrap px-6 py-2.5 text-lg leading-none",
                i % 2 === 1 ? "bg-tinta text-acento" : "text-tinta",
              )}
            >
              {title}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

/**
 * Cada campo entra con un desfase pequeño al montar: el formulario se arma a la
 * vista en vez de aparecer de golpe, y se lee el orden de lo que hay que llenar.
 */
export function FieldReveal({
  index = 0,
  children,
}: {
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.5), ease }}
    >
      {children}
    </motion.div>
  );
}
