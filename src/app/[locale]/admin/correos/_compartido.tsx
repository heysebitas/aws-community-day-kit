"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import type { Bloque } from "@/emails/bloques";
import type { Audiencia } from "@/lib/audiencias";
import { cn, localePath } from "@/lib/utils";

/** Lo que comparten las dos pantallas de correos. */

export interface Plantilla {
  _id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  asunto: string;
  preview: string;
  bloques: Bloque[];
  audiencia: Audiencia | null;
  deSistema: boolean;
  /** Su contenido viene del código y el panel no lo deja editar. */
  bloqueada: boolean;
  disparador: string;
  activa: boolean;
  actualizadaPor: string | null;
  updatedAt: string;
}

/** Trae las plantillas. Las dos pantallas parten de la misma lista. */
export function usePlantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/email-templates");
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { plantillas: Plantilla[] };
      setPlantillas(d.plantillas);
      setError(false);
      return d.plantillas;
    } catch {
      setError(true);
      return [];
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  return { plantillas, setPlantillas, cargando, error, cargar };
}

// ── Volver al principio ───────────────────────────────────────────────

/** El camino de vuelta a las dos secciones. */
export function Volver({ donde }: { donde: string }) {
  const locale = useLocale();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link
        href={localePath(locale, "/admin/correos")}
        className="inline-flex min-h-11 items-center gap-2 border-2 border-surface-600 bg-surface-800 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-surface-300 transition-colors hover:border-acento hover:text-acento"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Correos
      </Link>
      <span className="font-mono text-xs uppercase tracking-wider text-surface-500">/</span>
      <span className="font-mono text-xs font-bold uppercase tracking-wider text-acento">{donde}</span>
    </div>
  );
}

// ── La lista de la izquierda ─────────────────────────────────────────────────

export function ListaPlantillas({
  plantillas,
  slug,
  onElegir,
  pie,
}: {
  plantillas: Plantilla[];
  slug: string | null;
  onElegir: (slug: string) => void;
  /** La nota de abajo, distinta en cada pantalla. */
  pie: React.ReactNode;
}) {
  /** Separadas por de dónde salen, no por quién las manda. */
  const deFabrica = plantillas.filter((p) => p.deSistema || p.bloqueada);
  const propias = plantillas.filter((p) => !p.deSistema && !p.bloqueada);

  const fila = (p: Plantilla) => (
    <button
      key={p.slug}
      type="button"
      onClick={() => onElegir(p.slug)}
      aria-current={p.slug === slug ? "true" : undefined}
      className={cn(
        "w-full border-2 p-2.5 text-left transition-colors",
        p.slug === slug
          ? "border-acento bg-acento/10"
          : "border-surface-600 bg-surface-800 hover:border-surface-500",
      )}
    >
      <span className="flex items-center gap-1.5">
        {p.deSistema || p.bloqueada
          ? <Lock className="h-3 w-3 shrink-0 text-surface-400" />
          : <Mail className="h-3 w-3 shrink-0 text-surface-400" />}
        <span className={cn(
          "truncate font-mono text-xs font-bold",
          p.slug === slug ? "text-acento" : "text-surface-100",
        )}>
          {p.nombre}
        </span>
      </span>
      {p.disparador && (
        <span className="mt-1 block font-mono text-[10px] leading-snug text-surface-400">
          {p.disparador}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-surface-400">
          vienen con el sistema
        </span>
        {deFabrica.map(fila)}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-surface-400">
          propias
        </span>
        {propias.length ? propias.map(fila) : (
          <p className="m-0 font-mono text-[11px] leading-relaxed text-surface-500">
            Ninguna todavía. Las propias son las que escribes tú desde acá.
          </p>
        )}
      </div>

      <p className="m-0 font-mono text-[10px] leading-relaxed text-surface-400">{pie}</p>
    </div>
  );
}
