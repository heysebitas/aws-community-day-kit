"use client";

import { useCallback, useEffect, useState } from "react";
import {
  QrCode, Utensils, Coffee, Stamp, Activity, Trophy, RefreshCw, Award,
} from "lucide-react";
import { Barras } from "@/components/admin/graficas";
import { PAIS } from "@/config";

interface EventStats {
  isAdmin: boolean;
  totalRegistrations: number;
  totalCheckedIn: number;
  checkInRate: number;
  lunches: number;
  snacks: number;
  totalBadges: number;
  sessionAttendance: { title: string; room: string; startTime: string; count: number }[];
  badgesBySponsor: { name: string; count: number }[];
  distribution: { stamps: number; people: number }[];
  leaderboard: { name: string; count: number; firstStampAt: string | null; lastStampAt: string | null }[];
}

const C = { orange: "var(--color-acento)", emerald: "#34d399", amber: "#fbbf24", purple: "#a78bfa", sky: "#38bdf8", blue: "#60a5fa" };

function Counter({ label, value, icon: Icon, accent, hint }: { label: string; value: number; icon: React.ElementType; accent: string; hint?: string }) {
  return (
    <div className="border-2 border-surface-600 bg-surface-800 p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-surface-400">{label}</p>
          <p className={`mt-1.5 font-mono text-3xl font-bold tabular-nums ${accent}`}>{value.toLocaleString(PAIS.locale)}</p>
          {hint && <p className="mt-0.5 font-mono text-[9px] text-surface-300">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-surface-800">
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children, accent }: { icon: React.ElementType; children: React.ReactNode; accent?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className={`h-4 w-4 ${accent || "text-surface-400"}`} />
      <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-surface-400">{children}</h2>
    </div>
  );
}

const recortar = (v: string) => (v.length > 22 ? v.slice(0, 22) + "…" : v);

export default function EventDashboardPage() {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);

  // El estado arranca en `loading: true`, así que la primera carga no necesita
  // encenderlo otra vez; y el refresco de cada minuto es silencioso a propósito
  // (parpadear el tablero entero cada 60s estorba más de lo que informa).
  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const r = await fetch("/api/stats/event", { signal });
      const d = await r.json();
      if (!d.error) setStats(d);
    } catch {
      // Petición abortada o red caída: se conserva lo último que se mostró.
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  /** Refresco manual: éste sí enciende el indicador, es una acción del usuario. */
  const refresh = useCallback(() => {
    setLoading(true);
    void load(new AbortController().signal);
  }, [load]);

  useEffect(() => {
    // Se aborta al desmontar, para no llamar a setState sobre un componente desmontado.
    const ac = new AbortController();
    void load(ac.signal);
    const t = setInterval(() => void load(ac.signal), 60000);
    return () => {
      ac.abort();
      clearInterval(t);
    };
  }, [load]);

  const fmtTime = (s: string | null) => (s ? new Date(s).toLocaleString(PAIS.locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b-2 border-surface-600 pb-4">
        <div className="text-center lg:text-left">
          <h1 className="dot-matrix m-0 text-2xl leading-none text-surface-50 sm:text-3xl">
            tablero en vivo
          </h1>
        </div>
        <button onClick={refresh} disabled={loading}
          className="inline-flex items-center justify-center gap-2 border-2 border-surface-600 bg-surface-800 px-4 py-2 font-mono text-xs font-semibold text-surface-200 transition-colors hover:bg-surface-700 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {!stats ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-acento border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Contadores grandes */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Counter label="Check-ins" value={stats.totalCheckedIn} icon={QrCode} accent="text-emerald-400" hint={`${stats.checkInRate}% de ${stats.totalRegistrations}`} />
            <Counter label="Almuerzos" value={stats.lunches} icon={Utensils} accent="text-amber-400" />
            <Counter label="Refrigerios" value={stats.snacks} icon={Coffee} accent="text-sky-400" />
            <Counter label="Badges entregados" value={stats.totalBadges} icon={Stamp} accent="text-purple-400" />
          </div>

          {/* Asistencia por sesión */}
          <section>
            <SectionTitle icon={Activity} accent="text-sky-400">Asistencia por sesión</SectionTitle>
            <div className="border-2 border-surface-600 bg-surface-800 p-5">
              {stats.sessionAttendance.length === 0 ? (
                <p className="py-8 text-center font-mono text-xs text-surface-300">Sin sesiones</p>
              ) : (
                <Barras
                  data={stats.sessionAttendance}
                  alto={Math.max(160, stats.sessionAttendance.length * 34)}
                  horizontal
                  categoria="title"
                  valor="count"
                  color={C.sky}
                  anchoEje={150}
                  formatoEje={recortar}
                  margen={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  tooltipSimple
                />
              )}
            </div>
          </section>

          {/* Badges por sponsor */}
          <section>
            <SectionTitle icon={Award} accent="text-purple-400">Badges recolectados por sponsor</SectionTitle>
            <div className="border-2 border-surface-600 bg-surface-800 p-5">
              {stats.badgesBySponsor.length === 0 ? (
                <p className="py-8 text-center font-mono text-xs text-surface-300">Sin sponsors activos</p>
              ) : (
                <Barras
                  data={stats.badgesBySponsor}
                  alto={Math.max(160, stats.badgesBySponsor.length * 34)}
                  horizontal
                  categoria="name"
                  valor="count"
                  color={C.purple}
                  anchoEje={150}
                  formatoEje={recortar}
                  margen={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  tooltipSimple
                />
              )}
            </div>
          </section>

          {/* Distribución de pasaporte */}
          <section>
            <SectionTitle icon={Stamp} accent="text-orange-400">Distribución de pasaporte (cuántas personas tienen N badges)</SectionTitle>
            <div className="border-2 border-surface-600 bg-surface-800 p-5">
              {stats.distribution.length === 0 ? (
                <p className="py-8 text-center font-mono text-xs text-surface-300">Sin datos</p>
              ) : (
                <Barras
                  data={stats.distribution}
                  alto={220}
                  categoria="stamps"
                  valor="people"
                  color={C.orange}
                  margen={{ top: 8, right: 12, left: -20, bottom: 0 }}
                  tooltipSimple
                />
              )}
            </div>
          </section>

          {/* Leaderboard — solo admin */}
          {stats.isAdmin && (
            <section>
              <SectionTitle icon={Trophy} accent="text-amber-400">Top pasaporte (interno · para premios)</SectionTitle>
              <div className="-mx-4 overflow-x-auto border-y-2 border-surface-600 bg-surface-800 sm:mx-0 sm:border-2">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-surface-600">
                      <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-surface-400">#</th>
                      <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-surface-400">Nombre</th>
                      <th className="px-4 py-3 text-center font-mono text-xs font-semibold uppercase tracking-wider text-surface-400">Badges</th>
                      <th className="hidden px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-surface-400 sm:table-cell">Último sello</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.leaderboard.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-10 text-center font-mono text-sm text-surface-300">Nadie ha recolectado badges aún</td></tr>
                    ) : (
                      stats.leaderboard.map((p, i) => (
                        <tr key={i} className="border-b border-surface-600/50 hover:bg-surface-800">
                          <td className="px-4 py-3 font-mono text-sm font-bold text-acento tabular-nums">{i + 1}</td>
                          <td className="px-4 py-3 font-mono text-sm text-surface-100 truncate max-w-[200px]">{p.name}</td>
                          <td className="px-4 py-3 text-center font-mono text-sm font-bold text-purple-400 tabular-nums">{p.count}</td>
                          <td className="hidden px-4 py-3 font-mono text-xs text-surface-400 whitespace-nowrap sm:table-cell">{fmtTime(p.lastStampAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 font-mono text-[10px] text-surface-300">
                Orden: más badges primero; a igualdad, quien terminó antes. El total de badges aún puede cambiar.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
