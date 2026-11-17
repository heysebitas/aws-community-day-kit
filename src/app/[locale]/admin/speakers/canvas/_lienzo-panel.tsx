"use client";

import { Check } from "lucide-react";
import { Foto } from "@/components/ui/foto";
import { Lienzo } from "./_lienzo";
import { EVENTO, DOMINIO } from "@/config";
import type { Vista } from "./_use-canvas";
import { ESTADOS, FECHA } from "./_datos";

export function PanelLienzo({ c }: { c: Vista }) {
  const { guias, verS3, conDominio, qr, sucio, ajustes, perfil, cambiar, speakers, unSpeaker, tamTitulo } = c;
  return (
    <>
    {/* ── El lienzo ──────────────────────────────────────────────────── */}
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-bold text-surface-50">{perfil.name}</span>
        <span className="border-2 border-surface-600 px-2 py-0.5 font-mono text-[10px] uppercase text-surface-300">
          {ESTADOS.find((e) => e.valor === perfil.status)?.label ?? perfil.status}
        </span>
        {perfil.cardApproved && (
          <span className="flex items-center gap-1 border-2 border-acento/50 bg-acento/10 px-2 py-0.5 font-mono text-[10px] text-acento">
            <Check className="h-3 w-3" /> publicada
          </span>
        )}
        {sucio && (
          <span className="border-2 border-amber-400/50 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
            sin guardar
          </span>
        )}
      </div>

      {verS3 && perfil.cardImageUrl ? (
        <div className="border-2 border-surface-600 bg-surface-900 p-2">
          {/* El `?v=` salta la caché a propósito, así que va sin optimizar. */}
          <Foto src={`${perfil.cardImageUrl}?v=${Date.now()}`} alt="" unoptimized width={0} height={0} sizes="100vw" style={{ width: "100%", height: "auto" }} />
          <p className="m-0 mt-2 font-mono text-[11px] text-surface-400">
            Ésta es la imagen que está en S3, no la vista previa.
          </p>
        </div>
      ) : (
        <Lienzo
          speakers={speakers}
          track={perfil.track ?? "general"}
          fecha={FECHA}
          sede={EVENTO.sede.nombre}
          ciudad={EVENTO.sede.localidad}
          dominio={conDominio ? DOMINIO : ""}
          qrDataUrl={qr}
          // Con el tamaño ya resuelto: `ajustes.titleSize` es 0 cuando
          // está en automático, y eso no es un tamaño.
          ajustes={{ ...ajustes, titleSize: tamTitulo }}
          onChange={cambiar}
          guias={guias}
        />
      )}

      <p className="m-0 mt-2 font-mono text-[11px] leading-relaxed text-surface-400">
        {unSpeaker
          ? "Arrastra la foto para encuadrarla y usa la rueda para acercarla. Arrastra el bloque de texto para moverlo, y la raya para subir o bajar el nombre. Las flechas ← → cambian de persona."
          : "Con dos o más personas la maqueta se arma sola: las fotos llenan la columna y se centran entre la cabecera y el logo. No hay nada que mover."}
      </p>
    </div>
    </>
  );
}
