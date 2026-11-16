"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowRight, PencilLine, Send } from "lucide-react";
import { usePermiso } from "@/hooks/use-permiso";
import { Aviso, Cargando, PageHead } from "@/components/admin/ui";
import { cn, localePath } from "@/lib/utils";
import { usePlantillas } from "./_compartido";
import { PAIS } from "@/config";

/** Las dos puertas de la sección de correos. */

interface Campana {
  id: string;
  plantilla: string;
  enviados: number;
  createdAt: string;
}

export default function CorreosPage() {
  const locale = useLocale();
  const { soloLectura } = usePermiso("correos");
  const { plantillas, cargando } = usePlantillas();
  const [campanas, setCampanas] = useState<Campana[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/admin/campanas")
      .then((r) => r.json())
      .then((d) => { if (vivo) setCampanas((d.campanas ?? []) as Campana[]); })
      .catch(() => { if (vivo) setCampanas([]); });
    return () => { vivo = false; };
  }, []);

  if (cargando) return <Cargando />;

  const propias = plantillas.filter((p) => !p.deSistema).length;
  const sistema = plantillas.length - propias;

  const enviados = campanas?.reduce((n, c) => n + (c.enviados ?? 0), 0) ?? 0;
  const ultima = campanas?.[0];

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHead title="correos" />

      {soloLectura && (
        <Aviso tone="info" className="mb-4">
          Tienes esta sección en sólo lectura: puedes leer los correos y ver qué se mandó,
          pero no editarlos ni enviar nada.
        </Aviso>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Puerta
          href={localePath(locale, "/admin/correos/plantillas")}
          icono={PencilLine}
          titulo="plantillas"
          lema="Escribir y editar los correos"
          explica="El texto, los bloques y los botones de cada correo, con la vista previa al lado mientras escribes."
          lineas={[
            `${sistema} las manda el sistema`,
            propias ? `${propias} ${propias === 1 ? "propia" : "propias"}` : "ninguna propia todavía",
          ]}
        />

        <Puerta
          href={localePath(locale, "/admin/correos/campanas")}
          icono={Send}
          titulo="campañas"
          lema="Mandarlos y ver qué pasó"
          explica="A quién se le manda cada correo, el envío, y qué le llegó a cada persona."
          lineas={
            campanas === null
              ? ["…"]
              : [
                  enviados ? `${enviados} ${enviados === 1 ? "correo enviado" : "correos enviados"}` : "nada enviado todavía",
                  ultima
                    ? `última: ${new Date(ultima.createdAt).toLocaleDateString(PAIS.locale, {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}`
                    : "",
                ].filter(Boolean)
          }
        />
      </div>
    </div>
  );
}

function Puerta({
  href, icono: Icono, titulo, lema, explica, lineas,
}: {
  href: string;
  icono: React.ElementType;
  titulo: string;
  lema: string;
  explica: string;
  lineas: string[];
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[18rem] flex-col justify-between border-2 border-surface-600 bg-surface-800 p-6",
        "shadow-[6px_6px_0_0_rgba(0,0,0,0.4)] transition-all",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-acento",
        "hover:shadow-[8px_8px_0_0_var(--color-acento-fuerte)]",
        "focus-visible:border-acento focus-visible:outline-none",
      )}
    >
      <div>
        <Icono className="h-8 w-8 text-surface-400 transition-colors group-hover:text-acento" />
        <h2 className="dot-matrix m-0 mt-4 text-4xl leading-none text-surface-50 transition-colors group-hover:text-acento sm:text-5xl">
          {titulo}
        </h2>
        <p className="m-0 mt-2 font-mono text-xs font-bold uppercase tracking-wider text-acento">
          {lema}
        </p>
        <p className="m-0 mt-3 max-w-sm font-mono text-[11px] leading-relaxed text-surface-300">
          {explica}
        </p>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3 border-t-2 border-surface-600 pt-3">
        <span className="flex flex-col gap-0.5">
          {lineas.map((l) => (
            <span key={l} className="font-mono text-[11px] text-surface-400">{l}</span>
          ))}
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-surface-300 transition-all group-hover:translate-x-1 group-hover:text-acento" />
      </div>
    </Link>
  );
}
