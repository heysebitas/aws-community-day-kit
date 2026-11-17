"use client";

import { Aviso, Cargando, PageHead } from "@/components/admin/ui";
import { useCanvas, type Inicial, type Vista } from "./_use-canvas";
import { Cabecera, SelectorPersona } from "./_cabecera";
import { PanelLienzo } from "./_lienzo-panel";
import { MandosPersona, MandosGlobales } from "./_mandos";

export function CanvasEditor({ inicial }: { inicial?: Inicial }) {
  const c = useCanvas(inicial);
  const { cargando, perfil, dialog } = c;
  if (cargando) return <Cargando />;
  if (!perfil) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHead title="tarjetas de speakers" />
        <Aviso tone="info">Todavía no hay perfiles de speakers.</Aviso>
      </div>
    );
  }

  const v: Vista = { ...c, perfil, sinCategoria: !perfil.track || perfil.track === "general" };

  return (
    <div className="mx-auto max-w-[1500px]">
      <Cabecera c={v} />
      <SelectorPersona c={v} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PanelLienzo c={v} />
        <div className="flex flex-col gap-4">
          <MandosPersona c={v} />
          <MandosGlobales c={v} />
        </div>
      </div>

      {dialog}
    </div>
  );
}
