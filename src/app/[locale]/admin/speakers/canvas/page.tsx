"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Check, RotateCcw, Loader2, ImageUp,
  Save, Upload, UploadCloud, Eye, Crosshair, Maximize2, ListFilter, Tags,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Aviso, Cargando, HardButton, PageHead, Panel, SectionHead, Select } from "@/components/admin/ui";
import { SearchInput } from "@/components/ui/search-input";
import { useConfirm } from "@/components/admin/confirm";
import { usePermiso } from "@/hooks/use-permiso";
import { tamanoAutoTitulo, type SpeakerEntry } from "@/app/api/og/speaker/[slug]/_tarjeta";
import { TRACKS } from "@/data/session-tracks";
import { cn } from "@/lib/utils";
import { Lienzo, type Ajustes } from "./_lienzo";
import { EVENTO, PAIS, DOMINIO, SITIO, TEMA } from "@/config";

/** El editor de tarjetas. */

interface CanvasProfile {
  slug: string;
  name: string;
  status: string;
  track?: string;
  photo?: string;
  talkTitle: string;
  talkTitleCard: string;
  tagline: string;
  role: string;
  company: string;
  companyLogo?: string;
  roleCard: string;
  coSpeakers?: { firstName?: string; lastName?: string; photo?: string; role?: string; tagline?: string; company?: string; companyLogo?: string }[];
  cardContentX: number | null;
  cardContentY: number | null;
  cardNameOffset: number | null;
  cardTitleSize: number | null;
  cardNameSize: number | null;
  cardPhotoX: number | null;
  cardPhotoY: number | null;
  cardPhotoZoom: number | null;
  cardApproved: boolean;
  cardImageUrl: string;
}

const POR_DEFECTO = {
  contentX: 530, contentY: 180, nameOffset: 532, nameSize: 40,
  fotoX: 50, fotoY: 50, fotoZoom: 1,
};

/** Los estados por los que pasa una propuesta, con el nombre que se les da. */
const ESTADOS = [
  { valor: "submitted", label: "Postulado" },
  { valor: "reviewing", label: "En revisión" },
  { valor: "accepted", label: "Aceptado" },
  { valor: "scheduled", label: "Agendado" },
  { valor: "waitlisted", label: "En lista de espera" },
  { valor: "rejected", label: "Descartado" },
] as const;

const FECHA = new Date(EVENTO.inicio).toLocaleDateString(PAIS.locale, {
  day: "numeric", month: "long", year: "numeric", timeZone: EVENTO.zona,
});

function Numero({
  label, value, onChange, min, max, step = 1, sufijo,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; sufijo?: string;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-mono text-xs text-surface-300">{label}</span>
      <input
        type="range"
        value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 min-w-0 flex-1 cursor-pointer appearance-none bg-surface-600 accent-acento"
      />
      <input
        type="number"
        value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 shrink-0 border-2 border-surface-600 bg-surface-800 px-2 py-1 text-center font-mono text-xs text-acento focus:border-acento focus:outline-none"
      />
      {sufijo && <span className="w-6 shrink-0 font-mono text-[10px] text-surface-300">{sufijo}</span>}
    </label>
  );
}

function CanvasEditorInner() {
  const slugPedido = useSearchParams().get("slug");
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const { puedeEditar } = usePermiso("speakers");

  const [perfiles, setPerfiles] = useState<CanvasProfile[]>([]);
  const [indice, setIndice] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [lote, setLote] = useState<{ hechas: number; fallos: number; total: number } | null>(null);
  const [guias, setGuias] = useState(false);
  const [verS3, setVerS3] = useState(false);
  const [verCategorias, setVerCategorias] = useState(false);

  /** Si las tarjetas llevan el dominio bajo el QR. */
  const [conDominio, setConDominio] = useState(true);

  useEffect(() => {
    let vivo = true;
    fetch("/api/event-config")
      .then((r) => r.json())
      .then((d) => { if (vivo) setConDominio(d.tarjetaDominio !== false); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  /** Se guarda al momento y la vista previa cambia antes de la respuesta. */
  async function cambiarDominio(valor: boolean) {
    setConDominio(valor);
    try {
      const r = await fetch("/api/event-config", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarjetaDominio: valor }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setConDominio(!valor);
      toast("No se pudo guardar", "error");
    }
  }
  const [buscar, setBuscar] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("all");
  const [filtroSubida, setFiltroSubida] = useState("all");
  const [qr, setQr] = useState("");
  const [sucio, setSucio] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const [ajustes, setAjustes] = useState<Ajustes>({
    talkTitleCard: "", roleCard: "", ...POR_DEFECTO, titleSize: 0,
  });

  const perfil = perfiles[indice];

  // ── Carga ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/speaker-profiles/admin")
      .then((r) => r.json())
      .then((d) => {
        const ps = (d.profiles as CanvasProfile[]) ?? [];
        setPerfiles(ps);
        const pedido = slugPedido ? ps.findIndex((p) => p.slug === slugPedido) : -1;
        setIndice(pedido >= 0 ? pedido : 0);
        setCargando(false);
      })
      .catch(() => { toast("No se pudo cargar la lista", "error"); setCargando(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugPedido]);

  const lineaPorDefecto = (p: CanvasProfile) =>
    p.tagline || [p.role, p.company].filter(Boolean).join(" · ");

  // Al cambiar de persona se recarga el formulario con lo suyo.
  useEffect(() => {
    if (!perfil) return;
    const titulo = perfil.talkTitleCard || perfil.talkTitle || "";
    setAjustes({
      talkTitleCard: titulo,
      roleCard: perfil.roleCard || lineaPorDefecto(perfil),
      contentX: perfil.cardContentX ?? POR_DEFECTO.contentX,
      contentY: perfil.cardContentY ?? POR_DEFECTO.contentY,
      nameOffset: perfil.cardNameOffset ?? POR_DEFECTO.nameOffset,
      titleSize: perfil.cardTitleSize ?? 0,
      nameSize: perfil.cardNameSize ?? POR_DEFECTO.nameSize,
      fotoX: perfil.cardPhotoX ?? POR_DEFECTO.fotoX,
      fotoY: perfil.cardPhotoY ?? POR_DEFECTO.fotoY,
      fotoZoom: perfil.cardPhotoZoom ?? POR_DEFECTO.fotoZoom,
    });
    setSucio(false);
    setVerS3(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.slug]);

  // El QR se hace en el navegador, igual que el resto de la tarjeta.
  const slug = perfil?.slug;
  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    import("qrcode").then((QR) =>
      QR.toDataURL(`${SITIO}/speakers/${slug}`, {
        color: { dark: TEMA.acento, light: "#00000000" }, width: 220, margin: 1,
      }).then((url) => { if (vivo) setQr(url); }),
    );
    return () => { vivo = false; };
  }, [slug]);

  const cambiar = useCallback((cambio: Partial<Ajustes>) => {
    setAjustes((a) => ({ ...a, ...cambio }));
    setSucio(true);
  }, []);

  // ── Lo que ve el lienzo ─────────────────────────────────────────────────
  const speakers: SpeakerEntry[] = useMemo(() => {
    if (!perfil) return [];
    const co = (perfil.coSpeakers ?? []).slice(0, 3);
    return [
      {
        name: perfil.name, photo: perfil.photo ?? "", role: perfil.role ?? "",
        tagline: perfil.tagline ?? "", company: perfil.company ?? "",
        companyLogo: perfil.companyLogo ?? "",
      },
      ...co.map((c) => ({
        name: [c.firstName, c.lastName].filter(Boolean).join(" "),
        photo: c.photo ?? "", role: c.role ?? "", tagline: c.tagline ?? "",
        company: c.company ?? "", companyLogo: c.companyLogo ?? "",
      })),
    ];
  }, [perfil]);

  const unSpeaker = speakers.length === 1;
  const tamTitulo = ajustes.titleSize > 0 ? ajustes.titleSize : tamanoAutoTitulo(ajustes.talkTitleCard);

  // ── Acciones ────────────────────────────────────────────────────────────
  async function guardar() {
    if (!perfil) return;
    setGuardando(true);
    try {
      const res = await fetch(`/api/speaker-profiles/${perfil.slug}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          talkTitleCard: ajustes.talkTitleCard,
          roleCard: ajustes.roleCard,
          cardContentX: ajustes.contentX,
          cardContentY: ajustes.contentY,
          cardNameOffset: ajustes.nameOffset,
          cardTitleSize: ajustes.titleSize > 0 ? ajustes.titleSize : null,
          cardNameSize: ajustes.nameSize,
          cardPhotoX: ajustes.fotoX,
          cardPhotoY: ajustes.fotoY,
          cardPhotoZoom: ajustes.fotoZoom,
        }),
      });
      if (!res.ok) throw new Error();
      setPerfiles((ps) => ps.map((p, i) => i === indice ? {
        ...p,
        talkTitleCard: ajustes.talkTitleCard, roleCard: ajustes.roleCard,
        cardContentX: ajustes.contentX, cardContentY: ajustes.contentY,
        cardNameOffset: ajustes.nameOffset,
        cardTitleSize: ajustes.titleSize > 0 ? ajustes.titleSize : null,
        cardNameSize: ajustes.nameSize,
        cardPhotoX: ajustes.fotoX, cardPhotoY: ajustes.fotoY, cardPhotoZoom: ajustes.fotoZoom,
        cardApproved: false, cardImageUrl: "",
      } : p));
      setSucio(false);
      toast("Ajustes guardados", "success");
    } catch {
      toast("No se pudo guardar", "error");
    } finally { setGuardando(false); }
  }

  async function publicar() {
    if (!perfil) return;
    setPublicando(true);
    try {
      if (sucio) await guardar();
      const res = await fetch(`/api/speaker-profiles/${perfil.slug}/approve-card`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { cardImageUrl: string };
      setPerfiles((ps) => ps.map((p, i) => i === indice ? { ...p, cardApproved: true, cardImageUrl: d.cardImageUrl } : p));
      setVerS3(true);
      toast("Publicada en S3", "success");
    } catch {
      toast("No se pudo publicar", "error");
    } finally { setPublicando(false); }
  }

  async function reiniciar() {
    if (!perfil) return;
    const ok = await confirm({
      title: "Quitar la imagen publicada",
      message: `La tarjeta de ${perfil.name} se borra de S3. Los ajustes no se tocan: puedes volver a publicarla cuando quieras.`,
      confirmLabel: "Quitar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/speaker-profiles/${perfil.slug}/approve-card`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPerfiles((ps) => ps.map((p, i) => i === indice ? { ...p, cardApproved: false, cardImageUrl: "" } : p));
      setVerS3(false);
      toast("Imagen quitada", "success");
    } catch { toast("No se pudo quitar", "error"); }
  }

  /** Reemplaza la foto: sube la nueva y borra la anterior del bucket. */
  async function reemplazarFoto(f: File) {
    if (!perfil) return;
    setSubiendo(true);
    try {
      const pre = await fetch("/api/upload/presign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: f.type, size: f.size, folder: "speakers/photos" }),
      });
      if (!pre.ok) throw new Error("No se pudo preparar la subida");
      const { uploadUrl, publicUrl } = (await pre.json()) as { uploadUrl: string; publicUrl: string };

      const put = await fetch(uploadUrl, { method: "PUT", body: f, headers: { "Content-Type": f.type } });
      if (!put.ok) throw new Error("No se pudo subir");

      const res = await fetch(`/api/speaker-profiles/${perfil.slug}/photo`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: publicUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "No se pudo reemplazar");
      const d = (await res.json()) as { anteriorBorrada: boolean };

      setPerfiles((ps) => ps.map((p, i) => i === indice ? {
        ...p, photo: publicUrl, cardApproved: false, cardImageUrl: "",
        cardPhotoX: 50, cardPhotoY: 50, cardPhotoZoom: 1,
      } : p));
      cambiar({ fotoX: 50, fotoY: 50, fotoZoom: 1 });
      setSucio(false);
      toast(d.anteriorBorrada ? "Foto reemplazada, la anterior se borró" : "Foto reemplazada", "success");
    } catch (e) {
      toast((e as Error).message || "No se pudo reemplazar la foto", "error");
    } finally { setSubiendo(false); }
  }

  /** A quién le toca tarjeta: a todo el que tenga foto. */
  const conFoto = useMemo(() => perfiles.filter((p) => !!p.photo), [perfiles]);
  const sinFoto = perfiles.length - conFoto.length;

  async function republicarTodas() {
    const objetivo = objetivoLote;

    if (!objetivo.length) { toast("Nadie tiene foto, no hay nada que subir", "error"); return; }

    // El servidor dibuja con lo que hay en la base, no con lo que se ve en
    // pantalla: un encuadre que sólo se arrastró y no se guardó no llegaría a
    // la imagen. Se guarda antes para que no se pierda sin avisar.
    if (sucio) await guardar();

    const ok = await confirm({
      title: `Subir ${objetivo.length} tarjetas a S3`,
      message:
        `Se sube la tarjeta de ${objetivo.length} speakers` +
        (hayFiltro ? " (los que deja ver el filtro de ahora)" : "") +
        (sinFoto && !hayFiltro ? `, y ${sinFoto} sin foto quedan fuera` : "") +
        ". Cada una se dibuja de nuevo con lo que está guardado —encuadre, textos, posición y categoría— y reemplaza a la que hubiera en S3." +
        (hayFiltro ? "" : " Entra todo el mundo, también quien siga en revisión."),
      confirmLabel: "Subir todas",
    });
    if (!ok) return;

    setLote({ hechas: 0, fallos: 0, total: objetivo.length });
    let hechas = 0, fallos = 0;
    for (const p of objetivo) {
      try {
        const res = await fetch(`/api/speaker-profiles/${p.slug}/approve-card`, { method: "POST" });
        if (!res.ok) throw new Error();
        hechas++;
      } catch { fallos++; }
      setLote({ hechas, fallos, total: objetivo.length });
    }
    // La lista se recarga para que los estados de «publicada» queden al día.
    try {
      const d = await (await fetch("/api/speaker-profiles/admin")).json();
      setPerfiles((d.profiles as CanvasProfile[]) ?? []);
    } catch { /* lo que se vea seguirá valiendo hasta la próxima carga */ }
    setLote(null);
    toast(fallos ? `${hechas} regeneradas, ${fallos} con error` : `${hechas} regeneradas`, fallos ? "error" : "success");
  }

  async function cambiarTrack(valor: string, slugDestino?: string) {
    const destino = slugDestino ?? perfil?.slug;
    if (!destino) return;
    try {
      const res = await fetch(`/api/speaker-profiles/${destino}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: valor }),
      });
      if (!res.ok) throw new Error();
      setPerfiles((ps) => ps.map((p) => p.slug === destino ? { ...p, track: valor, cardApproved: false } : p));
      toast(valor === "general" ? "Sin categoría: el distintivo no sale" : "Categoría asignada", "success");
    } catch { toast("No se pudo cambiar la categoría", "error"); }
  }

  /** La lista que se recorre: la búsqueda más los dos filtros. */
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return perfiles
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => {
        const texto = !q || p.name.toLowerCase().includes(q) || (p.talkTitle ?? "").toLowerCase().includes(q);
        const estado = filtroEstado === "all" || p.status === filtroEstado;
        const subida =
          filtroSubida === "all" ||
          (filtroSubida === "si" ? p.cardApproved : !p.cardApproved);
        return texto && estado && subida;
      });
  }, [perfiles, buscar, filtroEstado, filtroSubida]);

  /** A quién se le sube la tarjeta con el botón de lote. */
  const hayFiltro = filtroEstado !== "all" || filtroSubida !== "all" || !!buscar.trim();

  const objetivoLote = useMemo(
    () => (hayFiltro ? lista.map(({ p }) => p) : conFoto).filter((p) => !!p.photo),
    [hayFiltro, lista, conFoto],
  );

  /** Dónde cae la persona abierta dentro de la lista filtrada. */
  const posicion = lista.findIndex(({ i }) => i === indice);

  const irA = useCallback(
    (salto: number) => {
      if (!lista.length) return;
      const actual = lista.findIndex(({ i }) => i === indice);
      // Si la persona abierta se quedó fuera del filtro, se entra por el borde.
      const siguiente = actual < 0 ? (salto > 0 ? 0 : lista.length - 1) : actual + salto;
      const destino = lista[Math.min(lista.length - 1, Math.max(0, siguiente))];
      if (destino) setIndice(destino.i);
    },
    [lista, indice],
  );

  /** Cuántos hay en cada estado, para enseñarlo en el desplegable. */
  const cuenta = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of perfiles) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [perfiles]);

  const subidas = useMemo(() => perfiles.filter((p) => p.cardApproved).length, [perfiles]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dentroDeCampo = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName);
      if (dentroDeCampo) return;
      if (e.key === "ArrowLeft") irA(-1);
      if (e.key === "ArrowRight") irA(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [irA]);

  if (cargando) return <Cargando />;
  if (!perfil) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHead title="tarjetas de speakers" />
        <Aviso tone="info">Todavía no hay perfiles de speakers.</Aviso>
      </div>
    );
  }

  const sinCategoria = !perfil.track || perfil.track === "general";

  return (
    <div className="mx-auto max-w-[1500px]">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${perfil.cardImageUrl}?v=${Date.now()}`} alt="" className="w-full" />
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

        {/* ── Los mandos ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionHead title="contenido" />
          <Panel>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs text-surface-300">Título en la tarjeta</span>
              <textarea
                value={ajustes.talkTitleCard}
                onChange={(e) => cambiar({ talkTitleCard: e.target.value })}
                rows={3}
                className="w-full resize-y border-2 border-surface-600 bg-surface-800 px-3 py-2 font-mono text-sm text-surface-100 placeholder:text-surface-400 focus:border-acento focus:outline-none"
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
                className="w-full border-2 border-surface-600 bg-surface-800 px-3 py-2 font-mono text-sm text-surface-100 focus:border-acento focus:outline-none"
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
        </div>
      </div>

      {dialog}
    </div>
  );
}

export default function CanvasEditorPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <CanvasEditorInner />
    </Suspense>
  );
}
