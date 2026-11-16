"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, MailCheck } from "lucide-react";
import { SectionHead } from "@/components/admin/ui";
import { ETIQUETA_ENVIO, type EstadoEnvio } from "@/data/email-estados";
import { cn } from "@/lib/utils";
import { PAIS } from "@/config";

/** Qué pasó con lo que ya se mandó. */

interface Campana {
  id: string;
  plantilla: string;
  nombrePlantilla: string;
  asunto: string;
  resumenAudiencia: string;
  estado: "enviando" | "hecho" | "error";
  total: number;
  enviados: number;
  fallidos: number;
  lanzadaPor: string;
  createdAt: string;
  entregas: Partial<Record<EstadoEnvio, number>>;
}

interface Envio {
  id: string;
  email: string;
  nombre: string;
  publico: string;
  estado: EstadoEnvio;
  motivo: string | null;
}

/** El color de cada estado. Los malos en rojo, los buenos en verde, el resto neutro. */
const TONO: Record<EstadoEnvio, string> = {
  entregado: "border-acento/50 bg-acento/15 text-acento",
  enviado: "border-surface-500 bg-surface-700 text-surface-200",
  rebotado: "border-red-500/50 bg-red-500/15 text-red-300",
  queja: "border-amber-400/50 bg-amber-400/15 text-amber-300",
  fallido: "border-red-500/50 bg-red-500/15 text-red-300",
};

const ORDEN_RESUMEN: EstadoEnvio[] = ["entregado", "enviado", "rebotado", "queja", "fallido"];

export function Historial({ plantilla, recargar }: { plantilla: string; recargar: number }) {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [envios, setEnvios] = useState<Record<string, Envio[]>>({});

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/campanas");
      if (!r.ok) throw new Error();
      const d = (await r.json()) as { campanas: Campana[] };
      setCampanas(d.campanas);
    } catch {
      setCampanas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar, recargar]);

  async function abrir(id: string) {
    if (abierta === id) { setAbierta(null); return; }
    setAbierta(id);
    if (envios[id]) return;
    try {
      const r = await fetch(`/api/admin/campanas/${id}`);
      if (!r.ok) return;
      const d = (await r.json()) as { envios: Envio[] };
      setEnvios((e) => ({ ...e, [id]: d.envios }));
    } catch { /* la fila se queda abierta y vacía */ }
  }

  // Sólo las de esta plantilla: el historial vive al lado de su editor.
  const mias = campanas.filter((c) => c.plantilla === plantilla);

  if (cargando) {
    return (
      <>
        <SectionHead title="lo que ya se mandó" />
        <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
      </>
    );
  }

  return (
    <>
      <SectionHead title="lo que ya se mandó" />

      {!mias.length ? (
        <p className="m-0 font-mono text-[11px] text-surface-400">
          Esta plantilla no se ha mandado como campaña todavía. Los correos que dispara el
          sistema —al aprobar a alguien, al registrarse— no aparecen acá.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {mias.map((c) => {
            const lista = envios[c.id];
            const malos = (c.entregas.rebotado ?? 0) + (c.entregas.queja ?? 0) + (c.entregas.fallido ?? 0);
            return (
              <div key={c.id} className="border-2 border-surface-600 bg-surface-800">
                <button
                  type="button"
                  onClick={() => void abrir(c.id)}
                  aria-expanded={abierta === c.id}
                  className="flex w-full items-start gap-2 p-2.5 text-left"
                >
                  {abierta === c.id
                    ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />
                    : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" />}

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-xs font-bold text-surface-50">
                        {new Date(c.createdAt).toLocaleDateString(PAIS.locale, {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span className="font-mono text-[11px] text-surface-400">
                        {c.enviados} de {c.total} · {c.lanzadaPor}
                      </span>
                      {malos > 0 && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-red-300">
                          <AlertTriangle className="h-3 w-3" /> {malos} con problema
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-surface-300">
                      {c.resumenAudiencia}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {ORDEN_RESUMEN.filter((e) => c.entregas[e]).map((e) => (
                        <span key={e} className={cn("border-2 px-1.5 font-mono text-[10px]", TONO[e])}>
                          {ETIQUETA_ENVIO[e]} {c.entregas[e]}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>

                {abierta === c.id && (
                  <div className="border-t-2 border-surface-600 p-2.5">
                    {!lista ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-surface-400" />
                    ) : !lista.length ? (
                      <p className="m-0 font-mono text-[11px] text-surface-400">Sin envíos registrados.</p>
                    ) : (
                      <ul className="m-0 list-none space-y-1 p-0">
                        {lista.map((e) => (
                          <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px]">
                            <span className={cn("border-2 px-1 text-[10px]", TONO[e.estado])}>
                              {ETIQUETA_ENVIO[e.estado]}
                            </span>
                            <span className="text-surface-200">{e.nombre || "(sin nombre)"}</span>
                            <span className="text-surface-400">{e.email}</span>
                            <span className="text-surface-500">{e.publico}</span>
                            {e.motivo && <span className="text-red-300">{e.motivo}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="m-0 mt-2 flex items-start gap-1.5 font-mono text-[10px] leading-relaxed text-surface-500">
                      <MailCheck className="mt-0.5 h-3 w-3 shrink-0" />
                      «Enviado» es que Resend lo aceptó; «entregado», que llegó al servidor de
                      destino. El estado lo va actualizando Resend por su cuenta, así que esto
                      cambia solo en los minutos siguientes a un envío.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
