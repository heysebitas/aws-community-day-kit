"use client";

import { ChevronLeft, ChevronRight, Loader2, UploadCloud, ListFilter, Tags } from "lucide-react";
import { Aviso, HardButton, PageHead, Panel, Select } from "@/components/admin/ui";
import { SearchInput } from "@/components/ui/search-input";
import { TRACKS } from "@/data/session-tracks";
import { cn } from "@/lib/utils";
import type { Vista } from "./_use-canvas";
import { ESTADOS } from "./_datos";

export function Cabecera({ c }: { c: Vista }) {
  const { puedeEditar, perfiles, indice, setIndice, lote, guias, setGuias, verCategorias, setVerCategorias, republicarTodas, cambiarTrack, lista, hayFiltro, objetivoLote } = c;
  return (
    <>
    <PageHead
      title="tarjetas de speakers"
      actions={
        puedeEditar ? (
          <>
            <HardButton tone="ghost" icon={ListFilter} onClick={() => setGuias((g) => !g)}>
              {guias ? "Ocultar guías" : "Ver guías"}
            </HardButton>
            <HardButton tone="ghost" icon={Tags} onClick={() => setVerCategorias((v) => !v)}>
              Categorías
            </HardButton>
            <HardButton tone="accent" icon={lote ? Loader2 : UploadCloud} onClick={() => void republicarTodas()} disabled={!!lote}>
              {lote
                ? `Subiendo ${lote.hechas + lote.fallos}/${lote.total}`
                : hayFiltro ? `Subir ${objetivoLote.length} a S3` : "Subir todas a S3"}
            </HardButton>
          </>
        ) : undefined
      }
    />

    {lote && (
      <Aviso tone="info" className="mb-4">
        Regenerando tarjetas… {lote.hechas + lote.fallos} de {lote.total}
        {lote.fallos > 0 && ` · ${lote.fallos} con error`}
      </Aviso>
    )}

    {/* ── Las categorías de todos, de un vistazo ──
        Asignarlas una a una abriendo cada ficha era el trabajo que más se
        repetía: acá salen las de todo el mundo en una lista. Al cambiar una
        su tarjeta de S3 queda marcada como vieja, y «Regenerar todas» las
        vuelve a subir. */}
    {verCategorias && (
      <Panel className="mb-4" label={`categoría de ${lista.length} speakers`}>
        <div className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto overscroll-contain">
          {lista.map(({ p }) => {
            const i = perfiles.indexOf(p);
            const suelta = !p.track || p.track === "general";
            return (
              <div
                key={p.slug}
                className="flex flex-col gap-2 border-2 border-surface-600 bg-surface-900 p-2 sm:flex-row sm:items-center"
              >
                <button
                  type="button"
                  onClick={() => setIndice(i)}
                  className={cn(
                    "min-w-0 flex-1 truncate text-left font-mono text-xs transition-colors hover:text-acento",
                    i === indice ? "font-bold text-acento" : "text-surface-100",
                  )}
                >
                  {p.name}
                  <span className="ml-2 text-surface-400">{(p.talkTitleCard || p.talkTitle || "").slice(0, 44)}</span>
                </button>
                {suelta && (
                  <span className="shrink-0 border-2 border-amber-400/50 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                    sin categoría
                  </span>
                )}
                <Select
                  value={p.track ?? "general"}
                  onChange={(v) => void cambiarTrack(v, p.slug)}
                  options={TRACKS.map((t) => [t.value, t.label] as const)}
                  className="sm:w-56"
                />
              </div>
            );
          })}
        </div>
      </Panel>
    )}
    </>
  );
}

export function SelectorPersona({ c }: { c: Vista }) {
  const { perfiles, indice, setIndice, buscar, setBuscar, filtroEstado, setFiltroEstado, filtroSubida, setFiltroSubida, lista, posicion, irA, cuenta, subidas } = c;
  return (
    <>
    {/* ── Quién ─────────────────────────────────────────────────────────── */}
    <div className="mb-4 border-2 border-surface-600 bg-surface-800 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => irA(-1)}
            disabled={posicion <= 0}
            aria-label="Anterior"
            className="flex h-10 w-10 items-center justify-center border-2 border-surface-600 text-surface-200 transition-colors hover:border-acento hover:text-acento disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-20 text-center font-mono text-xs text-surface-300">
            {posicion >= 0 ? posicion + 1 : "–"} / {lista.length}
          </span>
          <button
            type="button"
            onClick={() => irA(1)}
            disabled={posicion >= lista.length - 1}
            aria-label="Siguiente"
            className="flex h-10 w-10 items-center justify-center border-2 border-surface-600 text-surface-200 transition-colors hover:border-acento hover:text-acento disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <SearchInput
          placeholder="Buscar por nombre o charla…"
          defaultValue={buscar}
          onSearch={setBuscar}
          className="min-w-0 flex-1"
        />

        <Select
          label="Ir a"
          value={String(indice)}
          onChange={(v) => setIndice(Number(v))}
          options={
            lista.length
              ? lista.map(({ p, i }) => [String(i), `${p.name}${p.cardApproved ? " ✓" : ""}`] as const)
              : [["", "nadie con esos filtros"] as const]
          }
        />
      </div>

      {/* Los dos filtros que hacían falta: en qué va la propuesta y si su
          tarjeta ya está en S3. Las flechas se mueven dentro de lo filtrado. */}
      <div className="mt-3 flex flex-col gap-2 border-t-2 border-surface-600 pt-3 sm:flex-row sm:items-center">
        <Select
          label="Estado"
          value={filtroEstado}
          onChange={setFiltroEstado}
          options={[
            ["all", `Todos (${perfiles.length})`],
            ...ESTADOS.map((e) => [e.valor, `${e.label} (${cuenta[e.valor] ?? 0})`] as const),
          ]}
        />
        <Select
          label="Tarjeta"
          value={filtroSubida}
          onChange={setFiltroSubida}
          options={[
            ["all", `Todas (${perfiles.length})`],
            ["si", `Subidas a S3 (${subidas})`],
            ["no", `Sin subir (${perfiles.length - subidas})`],
          ]}
        />
        {(filtroEstado !== "all" || filtroSubida !== "all" || buscar) && (
          <button
            type="button"
            onClick={() => { setFiltroEstado("all"); setFiltroSubida("all"); setBuscar(""); }}
            className="self-start border-2 border-surface-600 px-3 py-2 font-mono text-xs text-surface-300 transition-colors hover:border-acento hover:text-acento"
          >
            Quitar filtros
          </button>
        )}
      </div>
    </div>
    </>
  );
}
