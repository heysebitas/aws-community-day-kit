"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { ClipboardList, MousePointerClick, Clock, Send, RefreshCw } from "lucide-react";
import { PAIS } from "@/config";

interface ClickRow { name: string; roleLabel: string; clicked: boolean; clickedAt: string | null; }
interface Data { sent: number; clicked: number; list: ClickRow[]; }

export default function EncuestaPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "clic" | "pendiente">("todos");

  /** Trae los datos sin tocar el estado de entrada. */
  const load = useCallback(
    () =>
      fetch("/api/admin/survey/clicks")
        .then((r) => r.json())
        .then((d) => { if (!d.error) setData(d); })
        .catch(() => {})
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => { void load(); }, [load]);

  const refrescar = () => { setLoading(true); void load(); };

  if (user?.role !== "admin") {
    return <div className="flex items-center justify-center py-24"><p className="font-mono text-surface-400">No tienes acceso a esta sección</p></div>;
  }

  const pending = data ? data.sent - data.clicked : 0;
  const list = (data?.list ?? []).filter((r) => filtro === "todos" || (filtro === "clic" ? r.clicked : !r.clicked));
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString(PAIS.locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b-2 border-surface-600 pb-4">
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="dot-matrix m-0 text-2xl leading-none text-surface-50 sm:text-3xl">
              encuesta post-evento
            </h1>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button onClick={refrescar} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-surface-600 bg-surface-800 px-3 py-2 font-mono text-xs font-semibold text-surface-200 hover:bg-surface-700 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <Link href="/admin/correos/campanas" className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 border-2 border-acento bg-acento px-4 py-2 font-mono text-xs font-bold text-surface-900 sm:col-span-1 hover:shadow-[0_0_16px_rgb(var(--tema-acento-rgb)_/_0.4)]">
            <Send className="h-3.5 w-3.5" /> Mandarla desde Correos
          </Link>
        </div>
      </div>

      <p className="m-0 mb-6 border-2 border-surface-600 bg-surface-800 p-3 font-mono text-[11px] leading-relaxed text-surface-300">
        La encuesta se manda como campaña desde <strong className="text-surface-100">Correos</strong>:
        escribe la plantilla con la variable <code className="text-acento">{"{encuesta}"}</code> —cada
        persona recibe su enlace propio— y marca «no escribir a quien ya la respondió» para los
        reenvíos. Acá se ve quién ha dado clic.
      </p>

      {/* Contadores */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Enviados", value: data?.sent ?? 0, icon: ClipboardList, accent: "text-surface-100" },
          { label: "Dieron clic", value: data?.clicked ?? 0, icon: MousePointerClick, accent: "text-emerald-400" },
          { label: "Pendientes", value: pending, icon: Clock, accent: "text-amber-400" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="border-2 border-surface-600 bg-surface-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-surface-400">{c.label}</p>
                  <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${c.accent}`}>{c.value.toLocaleString(PAIS.locale)}</p>
                </div>
                <Icon className={`h-5 w-5 ${c.accent}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtro */}
      <div className="mb-4 flex gap-1 border-2 border-surface-600 bg-surface-800 p-1 self-start w-fit">
        {([["todos", "Todos"], ["clic", "Con clic"], ["pendiente", "Pendientes"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setFiltro(v)} className={`px-3 py-1.5 font-mono text-xs font-semibold transition-all ${filtro === v ? "bg-acento text-surface-900" : "text-surface-400 hover:text-surface-200"}`}>{label}</button>
        ))}
      </div>

      {/* Tabla */}
      <div className="-mx-4 overflow-x-auto border-y-2 border-surface-600 bg-surface-800 sm:mx-0 sm:border-2">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-surface-600">
              <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-surface-400">Nombre</th>
              <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-surface-400">Rol</th>
              <th className="px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-surface-400">Estado</th>
              <th className="hidden px-4 py-3 text-left font-mono text-xs font-semibold uppercase tracking-wider text-surface-400 sm:table-cell">Clic</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center"><div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-acento border-t-transparent" /></td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center font-mono text-sm text-surface-300">{data?.sent ? "Sin resultados para este filtro" : "Aún no se ha enviado la encuesta"}</td></tr>
            ) : (
              list.map((r, i) => (
                <tr key={i} className="border-b border-surface-600/50 hover:bg-surface-800">
                  <td className="px-4 py-3 font-mono text-sm text-surface-100 truncate max-w-[220px]">{r.name}</td>
                  <td className="px-4 py-3"><span className="inline-block bg-surface-700 px-2 py-0.5 font-mono text-[10px] text-surface-300">{r.roleLabel}</span></td>
                  <td className="px-4 py-3">
                    {r.clicked
                      ? <span className="inline-flex items-center gap-1 bg-acento/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-acento"><MousePointerClick className="h-3 w-3" /> Dio clic</span>
                      : <span className="inline-flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-yellow-400"><Clock className="h-3 w-3" /> Pendiente</span>}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-surface-400 whitespace-nowrap sm:table-cell">{fmt(r.clickedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmaciones propias, no el popup del navegador. */}
    </div>
  );
}
