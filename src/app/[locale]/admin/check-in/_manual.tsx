"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, UserCheck, BadgeCheck, Printer, CheckCircle2, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { postEscaneo, esRepeticionPropia } from "@/lib/escaneo-cliente";
import { StatusCard, type CheckInResult } from "./_status-card";

type SearchHit = {
  id: string;
  qrCode: string;
  name: string;
  email: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  confirmed: boolean;
  badgeName: string;
};

// Chip pequeño de estado de escarapela (lista / falta)
function BadgeChip({ confirmed }: { confirmed: boolean }) {
  return confirmed ? (
    <span className="inline-flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
      <BadgeCheck className="h-3 w-3" /> Escarapela lista
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-400">
      <Printer className="h-3 w-3" /> Falta escarapela
    </span>
  );
}

export function ManualCheckIn({ onCheckedIn }: { onCheckedIn?: (total: number) => void }) {
  const t = useTranslations("Panel");
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Búsqueda con debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    // Una respuesta lenta de una tecla anterior no pisa a la más reciente.
    let vigente = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-in/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (vigente) setResults(data.results || []);
      } catch {
        if (vigente) setResults([]);
      } finally {
        if (vigente) setSearching(false);
      }
    }, 300);
    return () => { vigente = false; clearTimeout(t); };
  }, [query]);

  const doCheckIn = async (hit: SearchHit) => {
    setChecking(true);
    try {
      const { estado, data } = await postEscaneo<{
        name?: string; online?: boolean; confirmed?: boolean; badgeName?: string;
        checkedInAt?: string | null; checkedInBy?: string | null; totalCheckedIn?: number;
      }>("/api/check-in/scan", { qrCode: hit.qrCode });
      if (estado === "ok" || (estado === "ya" && esRepeticionPropia(data, user?.id))) {
        setResult({ outcome: "new", name: data.name, online: data.online, confirmed: data.confirmed, badgeName: data.badgeName, checkedInAt: data.checkedInAt });
        if (typeof data.totalCheckedIn === "number") onCheckedIn?.(data.totalCheckedIn);
      } else if (estado === "ya") {
        setResult({ outcome: "already", name: data.name, online: data.online, confirmed: data.confirmed, badgeName: data.badgeName, checkedInAt: data.checkedInAt });
      } else if (estado === "no_encontrado") {
        setResult({ outcome: "not_found", name: hit.name });
      } else {
        setResult({ outcome: "error", aviso: t(`escaneo.${estado}`), detalle: t(`escaneo.${estado}_detalle`) });
      }
    } catch {
      setResult({ outcome: "error", aviso: t("escaneo.reintenta"), detalle: t("escaneo.reintenta_detalle") });
    } finally {
      setChecking(false);
    }
  };

  const reset = () => {
    setResult(null);
    setSelected(null);
    setQuery("");
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // 1) Pantalla de resultado
  if (result) {
    return <StatusCard result={result} onNext={reset} nextLabel="Buscar otro" />;
  }

  // 2) Persona seleccionada → botón gigante de check-in
  if (selected) {
    return (
      <div className="border-2 border-surface-600 bg-surface-800 p-6 text-center sm:p-8">
        <p className="font-mono text-2xl font-black text-surface-50 break-words">{selected.name}</p>
        {selected.email && <p className="mt-1 font-mono text-sm text-surface-400 break-all">{selected.email}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <BadgeChip confirmed={selected.confirmed} />
          {selected.checkedIn && (
            <span className="inline-flex items-center gap-1 bg-yellow-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-yellow-400">
              <CheckCircle2 className="h-3 w-3" /> Ya hizo check-in
            </span>
          )}
        </div>

        <button
          onClick={() => doCheckIn(selected)}
          disabled={checking}
          className={`mt-6 flex w-full items-center justify-center gap-2.5 px-6 py-6 font-mono text-2xl font-black transition-transform active:scale-[0.98] disabled:opacity-60 ${
            selected.checkedIn
              ? "bg-yellow-500/20 border-2 border-yellow-500/50 text-yellow-300"
              : "bg-emerald-500 text-surface-900"
          }`}
        >
          {checking ? <Loader2 className="h-7 w-7 animate-spin" /> : <UserCheck className="h-7 w-7" />}
          {selected.checkedIn ? "Ver estado" : "HACER CHECK-IN"}
        </button>

        <button
          onClick={() => setSelected(null)}
          className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm text-surface-400 transition-colors hover:text-surface-200"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a la búsqueda
        </button>
      </div>
    );
  }

  // 3) Búsqueda
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-300" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputMode="search"
          autoFocus
          placeholder="Buscar por nombre, apellido o documento..."
          className="w-full border-2 border-surface-600 bg-surface-800 py-4 pl-12 pr-11 font-mono text-base text-surface-100 placeholder:text-surface-400 focus:border-acento focus:outline-hidden"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-surface-400 hover:bg-surface-700 hover:text-surface-200">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {searching && (
        <div className="flex items-center justify-center gap-2 py-8 font-mono text-sm text-surface-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
        </div>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="py-8 text-center font-mono text-sm text-surface-300">Sin resultados para “{query.trim()}”</p>
      )}

      {!searching && query.trim().length < 2 && (
        <p className="py-8 text-center font-mono text-sm text-surface-300">Escribe al menos 2 caracteres para buscar</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((hit) => (
          <button
            key={hit.id}
            onClick={() => setSelected(hit)}
            className="flex items-center justify-between gap-3 border-2 border-surface-600 bg-surface-700/40 p-4 text-left transition-colors hover:border-acento hover:bg-surface-800 active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="font-mono text-base font-bold text-surface-50 truncate">{hit.name}</p>
              {hit.email && <p className="font-mono text-xs text-surface-400 truncate">{hit.email}</p>}
              <div className="mt-1.5"><BadgeChip confirmed={hit.confirmed} /></div>
            </div>
            {hit.checkedIn && (
              <span className="shrink-0 inline-flex items-center gap-1 bg-yellow-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-yellow-400">
                <CheckCircle2 className="h-3 w-3" /> Check-in
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
