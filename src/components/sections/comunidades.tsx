"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { comunidades } from "@evento/comunidades";
import type { Comunidad } from "@/config/contenido";
import { ScrollReveal } from "@/components/effects/scroll-reveal";
import { BlockSection } from "@/components/ui/block-section";
import { DotHeading } from "@/components/ui/dot-heading";
import { basePath } from "@/lib/utils";

/** Las comunidades aliadas, al final del landing. */
export function Comunidades() {
  const t = useTranslations("Comunidades");

  return (
    <BlockSection id="comunidades" tone="block">
      <div className="text-center">
        <ScrollReveal>
          <DotHeading tone="block" variant="inverted" flicker>
            {t("heading")}
          </DotHeading>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <p className="mx-auto mt-6 max-w-xl font-mono text-sm leading-relaxed text-tinta/75 md:text-base">
            {t("lead")}
          </p>
        </ScrollReveal>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {comunidades.map((c, i) => (
          <ScrollReveal key={c.id} delay={0.05 * (i % 4)} from="scale">
            <Tarjeta comunidad={c} />
          </ScrollReveal>
        ))}
      </div>
    </BlockSection>
  );
}

function Tarjeta({ comunidad }: { comunidad: Comunidad }) {
  const contenido = (
    /* Una sola caja con el nombre dentro, partida por una raya: la misma ficha que usa el equipo organizador. */
    <div className="border-2 border-tinta bg-acento shadow-[6px_6px_0_0_var(--color-tinta)] transition-all duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[10px_10px_0_0_var(--color-tinta)]">
      <div className="flex h-28 items-center justify-center px-5 py-4 sm:h-32">
        <Image
          src={`${basePath}${comunidad.logo}`}
          alt={comunidad.nombre}
          width={400}
          height={200}
          // Los originales son grandes; en pantalla no pasan de un cuarto de fila.
          sizes="(min-width: 1024px) 260px, (min-width: 640px) 33vw, 45vw"
          className="max-h-full w-auto object-contain transition-opacity duration-200 group-hover:opacity-85"
        />
      </div>

      {/*
        Alto mínimo para que un nombre de dos líneas no descuadre la fila, y
        centrado: el logo de arriba va centrado en su caja, así que un nombre
        pegado a la izquierda dejaba la ficha descuadrada consigo misma.
      */}
      <div className="flex min-h-[3.25rem] items-center justify-center border-t-2 border-tinta px-3 py-2">
        <p className="m-0 text-center font-mono text-xs font-bold leading-tight text-tinta">
          {comunidad.nombre}
        </p>
      </div>
    </div>
  );

  // Sin sitio todavía no es un enlace: uno que no lleva a ninguna parte es peor
  // que no tenerlo.
  return comunidad.url ? (
    <a
      href={comunidad.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-tinta"
    >
      {contenido}
    </a>
  ) : (
    <div className="group">{contenido}</div>
  );
}
