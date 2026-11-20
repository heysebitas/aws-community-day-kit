"use client";

import { motion } from "motion/react";
import { ArrowUpRight, Terminal } from "lucide-react";
import { LowPoly } from "@/components/effects/low-poly";
import { DotHeading } from "@/components/ui/dot-heading";
import { POS, TRI } from "@/data/truck-model";
import { cn } from "@/lib/utils";
import { KIT } from "@/config/kit";

/** Quién hizo el kit y dónde está el código. */

const ease = [0.22, 1, 0.36, 1] as const;

const ENLACES = [
  {
    label: "GitHub",
    handle: "@heysebitas",
    href: "https://github.com/heysebitas",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    handle: "@justsebitas",
    href: "https://instagram.com/justsebitas",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Código",
    handle: KIT.slug,
    href: KIT.repo,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
      </svg>
    ),
  },
];

export function CreditosScreen() {
  return (
    <main className="form-block flex min-h-svh flex-col overflow-hidden bg-acento pt-28">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-5 pb-20 text-center">
        {/* Cómo llegaste acá */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="m-0 inline-flex items-center gap-2 border-2 border-tinta/30 bg-white/30 px-3 py-1.5 font-mono text-xs text-tinta/75"
        >
          <Terminal className="h-3.5 w-3.5" />
          código abierto
        </motion.p>

        {/* La camioneta */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease }}
          className="mt-6"
        >
          <LowPoly pos={POS} tri={TRI} size={400} ratio={0.7} fill={0.34} className="max-w-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="mt-2 flex flex-col items-center"
        >
          <p className="dot-matrix m-0 mb-4 text-lg leading-none text-tinta/70">
            este sitio lo hice yo
          </p>
          <DotHeading as="h1" tone="block" variant="inverted" flicker>
            imagina lo que puedo hacer por ti
          </DotHeading>

          <p className="mx-auto mt-6 max-w-[52ch] font-mono text-sm leading-relaxed text-tinta/80">
            Soy Sebastián Acuña. Diseño y construyo productos web de punta a
            punta: la interfaz, el backend, la base de datos y lo que haga falta
            para que salga a producción.
          </p>
        </motion.div>

        {/* Enlaces */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease }}
          className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-3"
        >
          {ENLACES.map((e) => (
            <a
              key={e.label}
              href={e.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex flex-col items-center gap-2 border-2 border-tinta bg-white/30 px-4 py-5",
                "transition-all hover:-translate-y-1 hover:bg-tinta hover:text-acento",
                "hover:shadow-[6px_6px_0_0_rgba(10,10,15,0.35)]",
              )}
            >
              <span className="text-tinta transition-colors group-hover:text-acento">
                {e.icon}
              </span>
              <span className="etiqueta leading-none">{e.label}</span>
              <span className="font-mono text-xs opacity-75">{e.handle}</span>
            </a>
          ))}
        </motion.div>

        <motion.a
          href={KIT.repo}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease }}
          className="btn-hard mt-8 inline-flex items-center gap-2 px-8 py-4 font-mono text-sm"
        >
          Úsalo para tu evento <ArrowUpRight className="h-4 w-4" />
        </motion.a>

        <motion.a
          href="/"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-8 font-mono text-xs text-tinta/70 underline underline-offset-4 hover:text-tinta"
        >
          volver al evento
        </motion.a>
      </div>

      {/* Cinta al pie, como en el resto del sitio */}
      <div className="overflow-hidden border-t-2 border-tinta/25" aria-hidden="true">
        <div className="flex w-max items-center" style={{ animation: "marquee 30s linear infinite" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "dot-matrix whitespace-nowrap px-6 py-2.5 text-lg leading-none",
                i % 2 === 1 ? "bg-tinta text-acento" : "text-tinta",
              )}
            >
              sebastián acuña · disponible · hablemos
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
