"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Loader2, Lock, PencilLine, TestTube2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { usePermiso } from "@/hooks/use-permiso";
import { Aviso, Cargando, HardButton, PageHead, Panel, SectionHead } from "@/components/admin/ui";
import { variablesUsadas } from "@/emails/bloques";
import type { Audiencia } from "@/lib/audiencias";
import { localePath } from "@/lib/utils";
import { EditorAudiencia } from "../_audiencia";
import { Historial } from "../_historial";
import { Vista } from "../_vista";
import { ListaPlantillas, Volver, usePlantillas } from "../_compartido";

/** Mandar los correos y ver qué pasó. */

export default function CampanasPage() {
  const { toast } = useToast();
  const locale = useLocale();
  const { puedeEditar, soloLectura } = usePermiso("correos");

  const { plantillas, cargando, error } = usePlantillas();
  const [slug, setSlug] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);
  const [recargar, setRecargar] = useState(0);

  const actual = useMemo(() => plantillas.find((p) => p.slug === slug) ?? null, [plantillas, slug]);

  useEffect(() => {
    if (!slug && plantillas.length) setSlug(plantillas[0].slug);
  }, [plantillas, slug]);

  useEffect(() => { if (error) toast("No se pudieron cargar las plantillas", "error"); }, [error, toast]);

  const usadas = useMemo(
    () => (actual ? variablesUsadas(actual.bloques, actual.asunto, actual.preview) : new Set<string>()),
    [actual],
  );

  /** La audiencia se edita acá y se guarda sola. */
  const [audiencia, setAudiencia] = useState<Audiencia>([]);

  useEffect(() => {
    setAudiencia(actual?.audiencia ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual?.slug]);

  useEffect(() => {
    // Una bloqueada trae su audiencia del código y el API rechaza cambiarla,
    // así que ni se intenta: guardaría en balde en cada selección.
    if (!actual || actual.deSistema || actual.bloqueada || !puedeEditar) return;
    // Nada que guardar si es lo mismo que ya hay.
    if (JSON.stringify(audiencia) === JSON.stringify(actual.audiencia ?? [])) return;

    const t = setTimeout(() => {
      void fetch(`/api/admin/email-templates/${actual.slug}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audiencia }),
      }).catch(() => toast("No se pudo guardar la audiencia", "error"));
    }, 600);
    return () => clearTimeout(t);
  }, [audiencia, actual, puedeEditar, toast]);

  /** Una copia a la cuenta de quien la pide. */
  async function prueba() {
    if (!actual) return;
    setProbando(true);
    try {
      const r = await fetch("/api/admin/campanas/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantilla: actual.slug, prueba: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error as string);
      toast(`Prueba enviada a ${d.a}`, "success");
    } catch (e) {
      toast((e as Error).message || "No se pudo mandar la prueba", "error");
    } finally { setProbando(false); }
  }

  if (cargando) return <Cargando />;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHead title="correos" />


      <Volver donde="Campañas" />

      {soloLectura && (
        <Aviso tone="info" className="mb-4">
          Tienes esta sección en sólo lectura: puedes ver a quién se le mandó y qué pasó, pero no enviar.
        </Aviso>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Las plantillas ──────────────────────────────────────────── */}
        <aside>
          <SectionHead title="qué correo" />
          <div className="mt-2">
            <ListaPlantillas
              plantillas={plantillas}
              slug={slug}
              onElegir={setSlug}
              pie="Las del candado las manda el sistema solo. Sólo las propias se mandan a un grupo."
            />
          </div>
        </aside>

        {/* ── El envío ────────────────────────────────────────────────── */}
        {actual ? (
          <div className="flex min-w-0 flex-col gap-4">
            <Panel>
              <p className="m-0 font-mono text-xs font-bold text-surface-50">{actual.nombre}</p>
              {actual.descripcion && (
                <p className="m-0 mt-1 font-mono text-[11px] leading-relaxed text-surface-300">
                  {actual.descripcion}
                </p>
              )}
              <div className="mt-2.5 border-t-2 border-surface-600 pt-2.5">
                <Link href={localePath(locale, "/admin/correos/plantillas")}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] text-surface-400 underline transition-colors hover:text-acento">
                  <PencilLine className="h-3 w-3" /> Cambiar el texto en Plantillas
                </Link>
              </div>
            </Panel>

            {actual.deSistema ? (
              /** Las de sistema no se mandan desde acá. */
              <Panel label="cuándo se manda">
                <p className="m-0 flex items-start gap-2 font-mono text-[11px] leading-relaxed text-surface-300">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
                  <span>
                    Lo manda el sistema solo, a una persona a la vez:{" "}
                    <strong className="text-surface-100">{actual.disparador.toLowerCase()}</strong>.
                    No hay audiencia que elegir ni botón de enviar.
                    <span className="mt-1.5 block text-surface-400">
                      Para escribirle a un grupo, crea una plantilla propia en Plantillas.
                    </span>
                  </span>
                </p>
                <div className="mt-3 border-t-2 border-surface-600 pt-3">
                  <HardButton tone="ghost" icon={probando ? Loader2 : TestTube2}
                    onClick={() => void prueba()} disabled={probando || !puedeEditar}>
                    {probando ? "Mandando…" : "Mandarme una prueba"}
                  </HardButton>
                </div>
              </Panel>
            ) : (
              <>
                <SectionHead title="a quién se le manda" />
                <EditorAudiencia
                  slug={actual.slug}
                  audiencia={audiencia}
                  onChange={setAudiencia}
                  onEnviado={() => setRecargar((n) => n + 1)}
                  usa={usadas}
                  puedeEnviar={puedeEditar}
                />
              </>
            )}

            {/* ── Lo que ya se mandó ─────────────────────────────────── */}
            <Historial plantilla={actual.slug} recargar={recargar} />
          </div>
        ) : (
          <Aviso tone="info">Elige un correo de la lista.</Aviso>
        )}

        {/* ── El correo ───────────────────────────────────────────────── */}
        <div className="min-w-0">
          {actual && (
            <Vista
              bloques={actual.bloques}
              preview={actual.preview}
              asunto={actual.asunto}
              usa={usadas}
            />
          )}
        </div>
      </div>
    </div>
  );
}
