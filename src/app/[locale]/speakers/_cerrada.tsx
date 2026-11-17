"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EVENTO, IDIOMA_BASE } from "@/config";
import { fechaCorta, fechaLarga } from "@/config/fechas";

export function ConvocatoriaCerrada() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-surface-900 px-6 py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgb(var(--tema-acento-rgb)_/_0.07),transparent)]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-xl text-center"
      >
        <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-acento">
          {EVENTO.nombreCompleto}
        </p>
        <h1 className="font-mono text-4xl font-bold text-surface-50 md:text-5xl leading-tight">
          La convocatoria cerró
        </h1>
        <p className="mt-6 font-mono text-base leading-relaxed text-surface-300">
          El Call for Speakers no está abierto en este momento.
          Los speakers seleccionados serán notificados directamente.
        </p>
        <p className="mt-4 font-mono text-sm leading-relaxed text-surface-400">
          El evento es el{" "}
          <strong className="text-surface-200">{fechaLarga(EVENTO.inicio, IDIOMA_BASE)}</strong> en {EVENTO.ciudad}.
          La entrada es gratuita: aún puedes ser parte.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 rounded-none bg-acento px-8 py-3.5 font-mono text-sm font-bold text-surface-900 transition-all hover:shadow-[0_0_30px_rgb(var(--tema-acento-rgb)_/_0.4)] active:scale-[0.98]"
          >
            Regístrate como participante
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/directorio"
            className="inline-flex items-center gap-2 rounded-none border border-acento/40 bg-acento/10 px-6 py-3 font-mono text-sm font-semibold text-acento transition-all hover:bg-acento hover:text-surface-900"
          >
            Ver speakers confirmados
          </Link>
        </div>
        <p className="mt-8 font-mono text-xs text-surface-400">
          {EVENTO.ciudad} · {fechaCorta(EVENTO.inicio)} · Gratuito
        </p>
      </motion.div>
    </main>
  );
}
