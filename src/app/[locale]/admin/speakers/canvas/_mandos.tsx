"use client";

import { RotateCcw, Loader2, ImageUp, Save, Upload, UploadCloud, Eye, Crosshair, Maximize2 } from "lucide-react";
import { HardButton, Panel, SectionHead, Select } from "@/components/admin/ui";
import { TRACKS } from "@/data/session-tracks";
import { cn } from "@/lib/utils";
import { DOMINIO } from "@/config";
import type { Vista } from "./_use-canvas";
import { POR_DEFECTO, Numero } from "./_datos";

export function MandosPersona({ c }: { c: Vista }) {
  const { subiendo, archivo, ajustes, perfil, cambiar, unSpeaker, tamTitulo, reemplazarFoto, cambiarTrack, sinCategoria } = c;
  return (
    <>
    <SectionHead title="contenido" />
    <Panel>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-xs text-surface-300">Título en la tarjeta</span>
        <textarea
          value={ajustes.talkTitleCard}
          onChange={(e) => cambiar({ talkTitleCard: e.target.value })}
          rows={3}
          className="w-full resize-y border-2 border-surface-600 bg-surface-800 px-3 py-2 font-mono text-sm text-surface-100 placeholder:text-surface-400 focus:border-acento focus:outline-hidden"
        />
        <span className="font-mono text-[10px] text-surface-300">
          {ajustes.talkTitleCard.length} caracteres · se dibuja a {tamTitulo}px
        </span>
      </label>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="font-mono text-xs text-surface-300">Línea bajo el nombre</span>
        <input
          value={ajustes.roleCard}
          onChange={(e) => cambiar({ roleCard: e.target.value })}
          className="w-full border-2 border-surface-600 bg-surface-800 px-3 py-2 font-mono text-sm text-surface-100 focus:border-acento focus:outline-hidden"
        />
      </label>

      <div className="mt-3">
        <Select
          label="Categoría"
          value={perfil.track ?? "general"}
          onChange={(v) => void cambiarTrack(v)}
          options={TRACKS.map((t) => [t.value, t.label] as const)}
        />
        <p className="m-0 mt-2 font-mono text-[11px] leading-relaxed text-surface-400">
          {sinCategoria
            ? "En «General» el distintivo no se dibuja, pero sigue ocupando su sitio: al asignar una categoría de verdad el título no se mueve."
            : "El distintivo sale con el color de esta categoría."}
        </p>
      </div>
    </Panel>

    {unSpeaker && (
      <>
        <SectionHead title="la foto" />
        <Panel>
          <div className="flex flex-col gap-3">
            <Numero label="Encuadre ↔" value={Math.round(ajustes.fotoX)} onChange={(v) => cambiar({ fotoX: v })} min={0} max={100} sufijo="%" />
            <Numero label="Encuadre ↕" value={Math.round(ajustes.fotoY)} onChange={(v) => cambiar({ fotoY: v })} min={0} max={100} sufijo="%" />
            <Numero label="Acercar" value={ajustes.fotoZoom} onChange={(v) => cambiar({ fotoZoom: v })} min={1} max={3} step={0.05} sufijo="×" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <HardButton tone="ghost" icon={Crosshair} onClick={() => cambiar({ fotoX: 50, fotoY: 50, fotoZoom: 1 })}>
              Centrar
            </HardButton>
            <HardButton tone="ghost" icon={subiendo ? Loader2 : ImageUp} onClick={() => archivo.current?.click()}>
              {subiendo ? "Subiendo…" : "Cambiar foto"}
            </HardButton>
          </div>
          <input
            ref={archivo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void reemplazarFoto(f);
              e.target.value = "";
            }}
          />
          <p className="m-0 mt-2 font-mono text-[11px] leading-relaxed text-surface-400">
            La foto nueva sustituye a la anterior y la vieja se borra del bucket, así no se acumulan fotos sueltas que nadie sabe si siguen en uso.
          </p>
        </Panel>

        <SectionHead title="la maqueta" />
        <Panel>
          <div className="flex flex-col gap-3">
            <Numero label="Texto ↔" value={ajustes.contentX} onChange={(v) => cambiar({ contentX: v })} min={120} max={860} />
            <Numero label="Texto ↕" value={ajustes.contentY} onChange={(v) => cambiar({ contentY: v })} min={60} max={ajustes.nameOffset - 80} />
            <Numero label="Raya ↕" value={ajustes.nameOffset} onChange={(v) => cambiar({ nameOffset: v })} min={ajustes.contentY + 80} max={840} />
            <Numero label="Título" value={ajustes.titleSize || tamTitulo} onChange={(v) => cambiar({ titleSize: v })} min={20} max={60} sufijo="px" />
            <Numero label="Nombre" value={ajustes.nameSize} onChange={(v) => cambiar({ nameSize: v })} min={22} max={56} sufijo="px" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <HardButton tone="ghost" icon={Maximize2} onClick={() => cambiar({ titleSize: 0 })}>
              Título automático
            </HardButton>
            <HardButton tone="ghost" icon={RotateCcw} onClick={() => cambiar(POR_DEFECTO)}>
              Valores por defecto
            </HardButton>
          </div>
        </Panel>
      </>
    )}
    </>
  );
}

export function MandosGlobales({ c }: { c: Vista }) {
  const { puedeEditar, guardando, publicando, lote, verS3, setVerS3, conDominio, cambiarDominio, sucio, perfil, guardar, publicar, reiniciar, republicarTodas, hayFiltro, objetivoLote } = c;
  return (
    <>
    {/* ── Lo que vale para todas ──────────────────────────────────
        Separado de «la maqueta», que es de esta persona: acá lo que se
        toca cambia todas las tarjetas. */}
    <SectionHead title="todas las tarjetas" />
    <Panel>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={conDominio}
          disabled={!puedeEditar}
          onChange={(e) => void cambiarDominio(e.target.checked)}
          className="mt-0.5"
        />
        <span className="font-mono text-[11px] leading-relaxed text-surface-300">
          Mostrar <strong className="text-surface-100">{DOMINIO}</strong> bajo el QR.
          <span className="block text-surface-300">
            Vale para todas las tarjetas. El QR no se toca: es el que lleva al perfil.
          </span>
        </span>
      </label>
      <p className="m-0 mt-2.5 border-t-2 border-surface-600 pt-2 font-mono text-[10px] leading-relaxed text-surface-400">
        Las que ya están en S3 no cambian solas — hay que volver a subirlas con
        «{hayFiltro ? `Subir ${objetivoLote.length} a S3` : "Subir todas a S3"}».
      </p>
    </Panel>

    <SectionHead title="publicar" />
    <Panel>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <HardButton icon={guardando ? Loader2 : Save} onClick={() => void guardar()} disabled={guardando || !puedeEditar}>
          {guardando ? "Guardando…" : "Guardar"}
        </HardButton>
        <HardButton tone="accent" icon={publicando ? Loader2 : Upload} onClick={() => void publicar()} disabled={publicando || !puedeEditar}>
          {publicando ? "Publicando…" : "Publicar a S3"}
        </HardButton>
      </div>
      {perfil.cardApproved && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <HardButton tone="ghost" icon={Eye} onClick={() => setVerS3((v) => !v)}>
            {verS3 ? "Ver el editor" : "Ver la de S3"}
          </HardButton>
          <HardButton tone="ghost" icon={RotateCcw} onClick={() => void reiniciar()} disabled={!puedeEditar}>
            Quitar de S3
          </HardButton>
        </div>
      )}
      <div className="mt-3 border-t-2 border-surface-600 pt-3">
        <HardButton
          tone="ghost"
          icon={lote ? Loader2 : UploadCloud}
          onClick={() => void republicarTodas()}
          disabled={!!lote || !puedeEditar}
          className="w-full"
        >
          {lote
            ? `Subiendo ${lote.hechas + lote.fallos} de ${lote.total}`
            : hayFiltro
              ? `Subir las ${objetivoLote.length} filtradas a S3`
              : `Subir las ${objetivoLote.length} a S3`}
        </HardButton>
        <p className="m-0 mt-2 font-mono text-[11px] leading-relaxed text-surface-400">
          Genera y sube de una vez la tarjeta de todos los que tienen foto, estén en el
          estado en que estén. Es lo que hay que correr después de asignar categorías.
        </p>
      </div>

      <p className={cn("m-0 mt-3 font-mono text-[11px] leading-relaxed", sucio ? "text-amber-300" : "text-surface-400")}>
        {sucio
          ? "Hay cambios sin guardar. Al publicar se guardan solos."
          : "Publicar dibuja la tarjeta en el servidor y la sube a S3. Es la imagen que se comparte."}
      </p>
    </Panel>
    </>
  );
}
