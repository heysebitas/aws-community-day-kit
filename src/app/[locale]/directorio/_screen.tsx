"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { PublicProfile, coSpeakerAsProfile } from "@/components/sections/speakers";
import { TRACKS, trackCorto } from "@/data/session-tracks";
import { basePath, localePath } from "@/lib/utils";
import { useEventConfig } from "@/components/providers/event-config-provider";
import { keynotes } from "@evento/keynotes";
import {
  Search,
  X,
  MapPin,
  Mic2,
  ArrowRight,
  SlidersHorizontal,
  Radio,
  Clock,
} from "lucide-react";

import {
  DEFAULT_DUR_MS,
  useDebounce,
  SESSION_LABEL,
  LANG_LABEL,
  LEVEL_LABEL,
  hhmmToMs,
  msToKey,
  normSessionType,
  type AgendaEventItem,
  type DirItem,
} from "./_shared";
import {
  FilterSection,
  KeynoteDirectoryCard,
  DirectoryCard,
  AgendaSessionCard,
} from "./_components";
import { SITIO, EVENTO } from "@/config";
import { Foto } from "@/components/ui/foto";

// Página

type FilterState = {
  tracks: Set<string>;
  sessionTypes: Set<string>;
  languages: Set<string>;
  levels: Set<string>;
};

function emptyFilters(): FilterState {
  return { tracks: new Set(), sessionTypes: new Set(), languages: new Set(), levels: new Set() };
}

function toggleSet(s: Set<string>, v: string): Set<string> {
  const next = new Set(s);
  next.has(v) ? next.delete(v) : next.add(v);
  return next;
}

function countBy(items: DirItem[], pick: (i: DirItem) => string | undefined | null): Record<string, number> {
  const c: Record<string, number> = {};
  items.forEach((i) => { const v = pick(i); if (v) c[v] = (c[v] ?? 0) + 1; });
  return c;
}

// Estado en la URL (params en español) para que al volver atrás no se pierda lo buscado.
function parseUrlState(): { search: string; filters: FilterState } {
  if (typeof window === "undefined") return { search: "", filters: emptyFilters() };
  const sp = new URLSearchParams(window.location.search);
  const getSet = (k: string) => new Set((sp.get(k)?.split(",").map((s) => s.trim()).filter(Boolean)) ?? []);
  return {
    search: sp.get("buscar") ?? "",
    filters: { tracks: getSet("track"), sessionTypes: getSet("tipo"), languages: getSet("idioma"), levels: getSet("nivel") },
  };
}

export function DirectorioScreen({
  profiles,
  agenda,
}: {
  profiles: PublicProfile[];
  agenda: AgendaEventItem[];
}) {
  const locale = useLocale();
  const t = useTranslations("Directorio");
  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : (SITIO);

  const { showSpeakerCta } = useEventConfig();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nowMs, setNowMs] = useState(0); // 0 hasta montar → evita desajuste de hora SSR/CSR
  const [ready, setReady] = useState(false);
  const debouncedSearch = useDebounce(search, 280);

  // Restaura búsqueda/filtros desde la URL y arranca el reloj (?ahora=HH:mm para probar).
  useEffect(() => {
    const { search: s, filters: f } = parseUrlState();
    /* eslint-disable react-hooks/set-state-in-effect -- ver explicación arriba */
    setSearch(s);
    setFilters(f);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    const sp = new URLSearchParams(window.location.search);
    const ahora = sp.get("ahora");
    if (ahora && /^\d{1,2}:\d{2}$/.test(ahora)) { setNowMs(hhmmToMs(ahora)); return; }
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Guarda búsqueda/filtros en la URL (params en español).
  useEffect(() => {
    if (!ready) return;
    const sp = new URLSearchParams();
    if (debouncedSearch) sp.set("buscar", debouncedSearch);
    if (filters.tracks.size) sp.set("track", [...filters.tracks].join(","));
    if (filters.sessionTypes.size) sp.set("tipo", [...filters.sessionTypes].join(","));
    if (filters.languages.size) sp.set("idioma", [...filters.languages].join(","));
    if (filters.levels.size) sp.set("nivel", [...filters.levels].join(","));
    const ahora = new URLSearchParams(window.location.search).get("ahora");
    if (ahora) sp.set("ahora", ahora);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [debouncedSearch, filters, ready]);

  // Lista unificada: sesiones de speakers + actividades de la agenda sin speaker.
  const agendaBySlug = useMemo(() => {
    const m = new Map<string, { startMs: number; endMs: number }>();
    agenda.forEach((e) => {
      if (e.speakerSlug) m.set(e.speakerSlug, { startMs: hhmmToMs(e.startTime), endMs: hhmmToMs(e.endTime) });
    });
    return m;
  }, [agenda]);

  const profileSlugs = useMemo(() => new Set(profiles.map((p) => p.slug)), [profiles]);

  const allItems = useMemo<DirItem[]>(() => {
    const items: DirItem[] = [];
    profiles.forEach((p) => {
      const ag = agendaBySlug.get(p.slug);
      const startMs = ag?.startMs ?? (p.scheduledAt ? new Date(p.scheduledAt).getTime() : Infinity);
      const endMs = ag?.endMs ?? (Number.isFinite(startMs) ? startMs + DEFAULT_DUR_MS : Infinity);
      items.push({
        kind: "profile", id: `p-${p._id}`, profile: p,
        track: p.track, sessionType: p.sessionType, language: p.language, level: p.audienceLevel, room: p.room,
        startMs, endMs, startKey: Number.isFinite(startMs) ? msToKey(startMs) : "Sin horario",
        text: [p.name, p.talkTitle, p.role, p.tagline, p.countryCity, p.room, trackCorto(p.track)].filter(Boolean).join(" ").toLowerCase(),
      });
    });
    agenda.forEach((e) => {
      if (e.speakerSlug && profileSlugs.has(e.speakerSlug)) return; // ya se muestra como tarjeta de speaker
      const startMs = hhmmToMs(e.startTime);
      const endMs = hhmmToMs(e.endTime);
      items.push({
        kind: "event", id: `e-${e._id}`, event: e,
        track: e.track, sessionType: normSessionType(e.sessionType), language: e.language, level: e.level, room: e.room,
        startMs, endMs, startKey: msToKey(startMs),
        text: [e.title, e.speaker, e.room, e.description, trackCorto(e.track)].filter(Boolean).join(" ").toLowerCase(),
      });
    });
    return items;
  }, [profiles, agenda, agendaBySlug, profileSlugs]);

  // Conteos sobre la lista completa sin filtrar
  const trackCounts = useMemo(() => countBy(allItems, (i) => i.track), [allItems]);
  const typeCounts  = useMemo(() => countBy(allItems, (i) => i.sessionType), [allItems]);
  const langCounts  = useMemo(() => countBy(allItems, (i) => i.language), [allItems]);
  const levelCounts = useMemo(() => countBy(allItems, (i) => i.level), [allItems]);

  const activeFilterCount =
    filters.tracks.size + filters.sessionTypes.size + filters.languages.size + filters.levels.size;
  const searchActive = !!debouncedSearch || activeFilterCount > 0;

  const filteredItems = useMemo(() => {
    let r = allItems;
    if (filters.tracks.size)       r = r.filter((i) => filters.tracks.has(i.track));
    if (filters.sessionTypes.size) r = r.filter((i) => i.sessionType && filters.sessionTypes.has(i.sessionType));
    if (filters.languages.size)    r = r.filter((i) => i.language && filters.languages.has(i.language));
    if (filters.levels.size)       r = r.filter((i) => i.level && filters.levels.has(i.level));
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      r = r.filter((i) => i.text.includes(q));
    }
    return r;
  }, [allItems, filters, debouncedSearch]);

  // Agrupa por hora de inicio, en orden
  const groups = useMemo(() => {
    const g = new Map<string, { items: DirItem[]; sortMs: number }>();
    filteredItems.forEach((i) => {
      if (!g.has(i.startKey)) g.set(i.startKey, { items: [], sortMs: i.startMs });
      g.get(i.startKey)!.items.push(i);
    });
    return [...g.entries()]
      .sort(([, a], [, b]) => a.sortMs - b.sortMs)
      .map(([key, v]) => {
        v.items.sort((a, b) => (a.room ?? "").localeCompare(b.room ?? ""));
        return [key, v.items] as [string, DirItem[]];
      });
  }, [filteredItems]);

  // En vivo ahora, en la hora del evento
  const liveItems = useMemo(
    () => (nowMs > 0 ? allItems.filter((i) => Number.isFinite(i.startMs) && i.startMs <= nowMs && nowMs < i.endMs) : []),
    [allItems, nowMs],
  );
  const liveIds = useMemo(() => new Set(liveItems.map((i) => i.id)), [liveItems]);

  /** Sólo los cuatro tracks anunciados. */
  const trackOptions = TRACKS.map((t) => ({
    value: t.value,
    label: t.corto,
    color: `border ${t.publico}`,
  }));
  const sessionOptions = Object.entries(SESSION_LABEL).map(([value, label]) => ({ value, label }));
  const langOptions    = Object.entries(LANG_LABEL).map(([value, label])    => ({ value, label }));
  const levelOptions   = Object.entries(LEVEL_LABEL).map(([value, label])   => ({ value, label }));

  const clearAll = useCallback(() => { setFilters(emptyFilters()); setSearch(""); }, []);

  const goToItem = useCallback((id: string) => {
    const scroll = () => {
      const el = document.getElementById(`item-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return !!el;
    };
    if (scroll()) return;
    clearAll();
    setTimeout(scroll, 90);
  }, [clearAll]);

  const titleOf = (i: DirItem) => (i.kind === "profile" ? (i.profile.talkTitle || i.profile.name) : i.event.title);
  const roomOf  = (i: DirItem) => (i.kind === "profile" ? i.profile.room : i.event.room) || "";

  // sidebar (shared between desktop + mobile drawer)
  const sidebar = (
    <div className="flex flex-col gap-5">
      <FilterSection
        title="Track"
        options={trackOptions}
        active={filters.tracks}
        counts={trackCounts}
        onToggle={(v) => setFilters((f) => ({ ...f, tracks: toggleSet(f.tracks, v) }))}
      />
      <FilterSection
        title="Tipo de sesión"
        options={sessionOptions}
        active={filters.sessionTypes}
        counts={typeCounts}
        onToggle={(v) => setFilters((f) => ({ ...f, sessionTypes: toggleSet(f.sessionTypes, v) }))}
      />
      <FilterSection
        title="Idioma"
        options={langOptions}
        active={filters.languages}
        counts={langCounts}
        onToggle={(v) => setFilters((f) => ({ ...f, languages: toggleSet(f.languages, v) }))}
      />
      <FilterSection
        title="Nivel de audiencia"
        options={levelOptions}
        active={filters.levels}
        counts={levelCounts}
        onToggle={(v) => setFilters((f) => ({ ...f, levels: toggleSet(f.levels, v) }))}
      />
      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="rounded-lg border border-glass-border px-3 py-2 font-mono text-xs text-surface-400 hover:border-red-400/40 hover:text-red-400 transition-colors"
        >
          Limpiar {activeFilterCount} filtro{activeFilterCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );

  return (
    <main className="min-h-svh bg-surface-900">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-glass-border bg-surface-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgb(var(--tema-acento-rgb)_/_0.12),transparent)]" />

        {/* pt-28: el navbar es fijo y mide 80px, asi que con py-16 (64px) el
            titulo quedaba por debajo de la barra. El pb-16 original se
            mantiene. */}
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-24 text-center">
          {EVENTO.marca.mascota && (
            <Foto src={`${basePath}${EVENTO.marca.mascota}`} alt="" width={400} height={400} priority className="mx-auto mb-4 h-24 w-auto sm:h-32 lg:h-40" />
          )}

          <p className="etiqueta mb-2 text-acento">
            Directorio de Speakers
          </p>

          {/* Mismo tratamiento que el titular de la portada: tamaño atado al
              ancho de la ventana, interlineado corto y muy apretado. Es lo que
              hace que se lea como titular y no como encabezado cualquiera. */}
          <h1 className="m-0 font-display text-[13vw] font-medium lowercase leading-[0.85] tracking-tighter text-surface-50 sm:text-[10vw] lg:text-[6.4vw] xl:text-[5.375rem]">
            speakers {EVENTO.anio}
          </h1>

          <p className="mt-3 font-mono text-sm text-surface-400">
              {profiles.length === 0
                ? "Próximamente"
                : (() => {
                    const total = profiles.reduce((n, p) => n + 1 + (p.coSpeakers?.length ?? 0), 0);
                    const sessions = profiles.length;
                    return `${total} speaker${total !== 1 ? "s" : ""} · ${sessions} sesión${sessions !== 1 ? "es" : ""} confirmada${sessions !== 1 ? "s" : ""}`;
                  })()}
          </p>

          {/* Search */}
          <div className="relative mx-auto mt-8 max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar speaker, charla, empresa, sala…"
              className="w-full border-2 border-acento/30 bg-surface-800 py-3 pl-11 pr-10 font-mono text-sm text-surface-100 placeholder-surface-600 transition-colors focus:border-acento focus:outline-hidden"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-300 hover:text-surface-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick track chips — great on mobile (horizontal scroll) */}
          {allItems.length > 0 && (
            <div className="mx-auto mt-4 flex max-w-2xl gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-center sm:overflow-visible">
              {trackOptions.filter((o) => (trackCounts[o.value] ?? 0) > 0).map((o) => {
                const active = filters.tracks.has(o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => setFilters((f) => ({ ...f, tracks: toggleSet(f.tracks, o.value) }))}
                    className={`shrink-0 border-2 px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                      active
                        ? "border-acento bg-acento/15 text-acento"
                        : "border-glass-border bg-surface-800/60 text-surface-400 hover:border-surface-500 hover:text-surface-200"
                    }`}
                  >
                    {o.label}
                    <span className="ml-1.5 text-surface-300">{trackCounts[o.value]}</span>
                  </button>
                );
              })}
              {searchActive && (
                <button
                  onClick={clearAll}
                  className="shrink-0 border-2 border-surface-700 px-3 py-1.5 font-mono text-xs text-surface-400 transition-colors hover:border-acento hover:text-acento"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── HAPPENING NOW ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {liveItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-b border-yellow-400/30 bg-gradient-to-b from-yellow-400/[0.08] to-transparent"
          >
            <div className="mx-auto max-w-7xl px-6 py-6">
              <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/[0.06] p-5 shadow-[0_0_40px_rgba(250,204,21,0.10)]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  </span>
                  <Radio className="h-4 w-4 text-yellow-300" />
                  <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-yellow-300">
                    Ahora en vivo
                  </h2>
                  <span className="rounded-none bg-yellow-400/15 px-2 py-0.5 font-mono text-xs font-bold text-yellow-300">
                    {liveItems.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {liveItems.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => goToItem(i.id)}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-yellow-400/20 bg-surface-900/40 px-4 py-3 text-left transition-colors hover:border-yellow-400/50 hover:bg-yellow-400/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-surface-50 line-clamp-1">{titleOf(i)}</p>
                        <p className="mt-0.5 flex items-center gap-2 font-mono text-xs text-surface-400">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-300" />{msToKey(i.startMs)}–{msToKey(i.endMs)}</span>
                          {roomOf(i) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-yellow-300" />{roomOf(i)}</span>}
                        </p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-1.5 font-mono text-xs font-bold text-yellow-300 transition-colors group-hover:bg-yellow-400 group-hover:text-surface-900">
                        Ver <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KEYNOTES (hidden while searching/filtering) ──────────────────────── */}
      {keynotes.length > 0 && !searchActive && (
        <div className="border-b border-glass-border bg-surface-900/60">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-acento">
              {t("invitados")}
            </p>
            <h2 className="mb-6 font-mono text-xl font-bold text-surface-50">{t("keynotes")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {keynotes.map((kn, i) => (
                <KeynoteDirectoryCard key={i} kn={kn} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Mobile: filter toggle */}
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-sm font-semibold transition-all ${
              activeFilterCount > 0
                ? "border-acento/40 bg-acento/10 text-acento"
                : "border-glass-border bg-surface-800/60 text-surface-300 hover:border-surface-600"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="rounded-none bg-acento px-1.5 py-0.5 font-mono text-xs font-bold text-surface-900">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filteredItems.length > 0 && (
            <p className="font-mono text-sm text-surface-300">
              {filteredItems.length} de {allItems.length}
            </p>
          )}
        </div>

        {/* Mobile filter panel */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden rounded-2xl border border-glass-border bg-glass p-5 lg:hidden"
            >
              {sidebar}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-8">

          {/* Desktop sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-surface-300">Filtros</p>
                {activeFilterCount > 0 && (
                  <span className="rounded-none bg-acento px-1.5 py-0.5 font-mono text-xs font-bold text-surface-900">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {sidebar}
            </div>
          </aside>

          {/* Main grid */}
          <div className="min-w-0 flex-1">

            {/* Result count (desktop) */}
            {allItems.length > 0 && (
              <div className="mb-5 hidden items-center justify-between lg:flex">
                <p className="font-mono text-sm text-surface-300">
                  {filteredItems.length === allItems.length
                    ? `${allItems.length} sesiones`
                    : `${filteredItems.length} de ${allItems.length} sesiones`}
                </p>
                {searchActive && (
                  <button onClick={clearAll} className="font-mono text-xs text-acento hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {allItems.length === 0 && (
              <div className="py-24 text-center">
                <p className="font-mono text-xl text-surface-300">Próximamente</p>
                <p className={`mt-2 font-mono text-sm text-surface-300 ${showSpeakerCta ? "mb-8" : ""}`}>Los speakers confirmados aparecerán aquí</p>
                {showSpeakerCta && (
                  <Link
                    href={localePath(locale, "/speakers")}
                    className="inline-flex items-center gap-2 rounded-none bg-acento px-8 py-3.5 font-mono text-sm font-bold text-surface-900 transition-all hover:shadow-[0_0_30px_rgb(var(--tema-acento-rgb)_/_0.4)]"
                  >
                    <Mic2 className="h-4 w-4" /> Postúlate como speaker
                  </Link>
                )}
              </div>
            )}

            {/* Grid */}
            <AnimatePresence mode="popLayout">
              {allItems.length > 0 && filteredItems.length === 0 && (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="py-20 text-center"
                >
                  <p className="font-mono text-sm text-surface-300">Sin resultados para tu búsqueda</p>
                  <button onClick={clearAll} className="mt-4 font-mono text-xs text-acento hover:underline">
                    Limpiar filtros
                  </button>
                </motion.div>
              )}

              {filteredItems.length > 0 && (
                <motion.div key="cards" className="flex flex-col gap-10">
                  {groups.map(([title, items], gi) => (
                    <div key={title}>
                      {/* Session time divider */}
                      <div className="mb-5 flex items-center gap-4">
                        <div className="h-px flex-1 bg-surface-700/60" />
                        <p className="shrink-0 px-4 font-mono text-2xl font-bold text-acento tracking-widest leading-none">
                          {title}
                        </p>
                        <div className="h-px flex-1 bg-surface-700/60" />
                      </div>
                      <div className="flex flex-col gap-3">
                        {items.map((item, pi) => {
                          const live = liveIds.has(item.id);
                          if (item.kind === "event") {
                            return (
                              <motion.div
                                key={item.id}
                                id={`item-${item.id}`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ delay: gi * 0.03 + pi * 0.015 }}
                              >
                                <AgendaSessionCard
                                  event={item.event}
                                  startLabel={msToKey(item.startMs)}
                                  endLabel={msToKey(item.endMs)}
                                  isLive={live}
                                />
                              </motion.div>
                            );
                          }
                          const expanded = [
                            item.profile,
                            ...(item.profile.coSpeakers ?? []).map((co) => coSpeakerAsProfile(co, item.profile)),
                          ];
                          return (
                            <motion.div
                              key={item.id}
                              id={`item-${item.id}`}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.97 }}
                              transition={{ delay: gi * 0.03 + pi * 0.015 }}
                              className="flex flex-col gap-3"
                            >
                              {expanded.map((profile) => (
                                <DirectoryCard key={profile._id} profile={profile} locale={locale} appUrl={appUrl} isLive={live} />
                              ))}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Apply CTA */}
            {allItems.length > 0 && showSpeakerCta && (
              <div className="mt-12 flex justify-center">
                <Link
                  href={localePath(locale, "/speakers")}
                  className="inline-flex items-center gap-2 rounded-none border border-acento/40 bg-acento/10 px-6 py-3 font-mono text-sm font-semibold text-acento transition-all hover:bg-acento hover:text-surface-900"
                >
                  <Mic2 className="h-4 w-4" /> Postúlate como speaker
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
