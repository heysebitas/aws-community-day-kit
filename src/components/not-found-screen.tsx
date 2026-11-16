"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { WireSolid } from "@/components/effects/wire-solid";
import { EVENTO } from "@/config";

const ease = [0.22, 1, 0.36, 1] as const;

export type TextosNoEncontrado = {
  lead: string;
  evento: string;
  inicio: string;
  registro: string;
  hrefInicio: string;
  hrefRegistro: string;
};

function Cinta({ texto, invertida, className }: { texto: string; invertida?: boolean; className: string }) {
  return (
    <div className={`absolute inset-x-0 overflow-hidden border-y-2 border-acento/25 ${className}`} aria-hidden="true">
      <div
        className="flex w-max items-center"
        style={{ animation: `${invertida ? "marquee-reverse 36s" : "marquee 30s"} linear infinite` }}
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className={`dot-matrix whitespace-nowrap px-6 py-2 text-base leading-none sm:text-lg ${
              i % 2 === (invertida ? 0 : 1) ? "bg-acento text-tinta" : "text-acento"
            }`}
          >
            {texto}
          </span>
        ))}
      </div>
    </div>
  );
}

/** La pantalla 404. Los textos llegan por props porque también se usa fuera del árbol con idioma. */
export function NotFoundScreen({ textos }: { textos: TextosNoEncontrado }) {
  const cinta = `404 · ${EVENTO.nombre} ${EVENTO.anio} ·`;

  return (
    <main className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-surface-900">
      <Cinta texto={cinta} className="top-20" />
      <Cinta texto={cinta} invertida className="bottom-16" />

      <WireSolid
        shape="icosa"
        className="pointer-events-none absolute right-[-8%] top-1/2 hidden h-[560px] w-[560px] -translate-y-1/2 opacity-25 lg:block"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-6">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="dot-matrix text-lg text-acento md:text-xl"
        >
          error 404
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08, ease }}
          className="mt-2 font-display text-[22vw] font-medium leading-[0.8] tracking-tighter text-surface-50 sm:text-[18vw] lg:text-[13vw]"
        >
          404
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="mt-6 max-w-[46ch] font-mono text-base leading-relaxed text-surface-300"
        >
          {textos.lead} <span className="text-acento">{textos.evento}</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32, ease }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <Link
            href={textos.hrefInicio}
            className="inline-flex items-center bg-acento px-8 py-4 text-surface-900 shadow-[5px_5px_0_0_var(--color-acento-fuerte)] transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_var(--color-acento-fuerte)] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            <span className="dot-matrix text-lg leading-none">{textos.inicio}</span>
          </Link>
          <Link
            href={textos.hrefRegistro}
            className="inline-flex items-center border-2 border-acento px-8 py-4 text-acento transition-colors duration-200 hover:bg-acento hover:text-tinta"
          >
            <span className="dot-matrix text-lg leading-none">{textos.registro}</span>
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
