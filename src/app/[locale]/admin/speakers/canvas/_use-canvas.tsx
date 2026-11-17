"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/admin/confirm";
import { usePermiso } from "@/hooks/use-permiso";
import { tamanoAutoTitulo, type SpeakerEntry } from "@/app/api/og/speaker/[slug]/_tarjeta";
import { prepararImagen } from "@/lib/imagen-cliente";
import { type Ajustes } from "./_lienzo";
import { SITIO, TEMA } from "@/config";
import { useLista } from "./_use-lista";
import { pedirJson } from "@/lib/pedir-json";
import { POR_DEFECTO, type CanvasProfile } from "./_datos";

/** Estado de arranque; sirve para pintar el editor sin pedir nada (pruebas). */
export type Inicial = Partial<{ perfiles: CanvasProfile[]; cargando: boolean; categorias: boolean; guias: boolean }>;

export function useCanvas(inicial: Inicial = {}) {
  const slugPedido = useSearchParams().get("slug");
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const { puedeEditar } = usePermiso("speakers");

  const [perfiles, setPerfiles] = useState<CanvasProfile[]>(inicial.perfiles ?? []);
  const [indice, setIndice] = useState(0);
  const [cargando, setCargando] = useState(inicial.cargando ?? true);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [lote, setLote] = useState<{ hechas: number; fallos: number; total: number } | null>(null);
  const [guias, setGuias] = useState(inicial.guias ?? false);
  const [verS3, setVerS3] = useState(false);
  const [verCategorias, setVerCategorias] = useState(inicial.categorias ?? false);

  /** Si las tarjetas llevan el dominio bajo el QR. */
  const [conDominio, setConDominio] = useState(true);

  useEffect(() => {
    let vivo = true;
    pedirJson<{ tarjetaDominio?: boolean }>("/api/event-config")
      .then((r) => { if (vivo && r.status !== 0) setConDominio(r.data.tarjetaDominio !== false); });
    return () => { vivo = false; };
  }, []);

  /** Se guarda al momento y la vista previa cambia antes de la respuesta. */
  async function cambiarDominio(valor: boolean) {
    setConDominio(valor);
    const r = await pedirJson("/api/event-config", { method: "PATCH", body: { tarjetaDominio: valor } });
    if (!r.ok) {
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
    pedirJson<{ profiles?: CanvasProfile[] }>("/api/speaker-profiles/admin").then((r) => {
      if (r.status === 0) { toast("No se pudo cargar la lista", "error"); setCargando(false); return; }
      const ps = r.data.profiles ?? [];
      setPerfiles(ps);
      const pedido = slugPedido ? ps.findIndex((p) => p.slug === slugPedido) : -1;
      setIndice(pedido >= 0 ? pedido : 0);
      setCargando(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo el slug pedido recarga la lista
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cambiar de perfil reinicia el formulario; no cada edición del perfil
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
      const res = await pedirJson(`/api/speaker-profiles/${perfil.slug}`, {
        method: "PATCH",
        body: {
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
        },
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
      const res = await pedirJson<{ cardImageUrl: string }>(`/api/speaker-profiles/${perfil.slug}/approve-card`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d = res.data;
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
      const res = await pedirJson(`/api/speaker-profiles/${perfil.slug}/approve-card`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPerfiles((ps) => ps.map((p, i) => i === indice ? { ...p, cardApproved: false, cardImageUrl: "" } : p));
      setVerS3(false);
      toast("Imagen quitada", "success");
    } catch { toast("No se pudo quitar", "error"); }
  }

  /** Reemplaza la foto: sube la nueva y borra la anterior del bucket. */
  async function reemplazarFoto(original: File) {
    if (!perfil) return;
    setSubiendo(true);
    try {
      const f = await prepararImagen(original);
      const pre = await pedirJson<{ uploadUrl: string; publicUrl: string; headers: Record<string, string> }>("/api/upload/presign", {
        method: "POST", body: { contentType: f.type, size: f.size, folder: "speakers/photos" },
      });
      if (!pre.ok) throw new Error("No se pudo preparar la subida");
      const { uploadUrl, publicUrl, headers } = pre.data;

      const put = await fetch(uploadUrl, { method: "PUT", body: f, headers });
      if (!put.ok) throw new Error("No se pudo subir");

      const res = await pedirJson<{ anteriorBorrada: boolean }>(`/api/speaker-profiles/${perfil.slug}/photo`, {
        method: "PUT", body: { photo: publicUrl }, errorPorDefecto: "No se pudo reemplazar",
      });
      if (!res.ok) throw new Error(res.error ?? "No se pudo reemplazar");
      const d = res.data;

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
        const res = await pedirJson(`/api/speaker-profiles/${p.slug}/approve-card`, { method: "POST" });
        if (!res.ok) throw new Error();
        hechas++;
      } catch { fallos++; }
      setLote({ hechas, fallos, total: objetivo.length });
    }
    // La lista se recarga para que los estados de «publicada» queden al día.
    const d = await pedirJson<{ profiles?: CanvasProfile[] }>("/api/speaker-profiles/admin");
    // Si no hay respuesta, lo que se ve seguirá valiendo hasta la próxima carga.
    if (d.status !== 0) setPerfiles(d.data.profiles ?? []);
    setLote(null);
    toast(fallos ? `${hechas} regeneradas, ${fallos} con error` : `${hechas} regeneradas`, fallos ? "error" : "success");
  }

  async function cambiarTrack(valor: string, slugDestino?: string) {
    const destino = slugDestino ?? perfil?.slug;
    if (!destino) return;
    try {
      const res = await pedirJson(`/api/speaker-profiles/${destino}`, { method: "PATCH", body: { track: valor } });
      if (!res.ok) throw new Error();
      setPerfiles((ps) => ps.map((p) => p.slug === destino ? { ...p, track: valor, cardApproved: false } : p));
      toast(valor === "general" ? "Sin categoría: el distintivo no sale" : "Categoría asignada", "success");
    } catch { toast("No se pudo cambiar la categoría", "error"); }
  }

  const { lista, hayFiltro, posicion, irA, cuenta, subidas } = useLista(perfiles, indice, setIndice, buscar, filtroEstado, filtroSubida);

  const objetivoLote = useMemo(
    () => (hayFiltro ? lista.map(({ p }) => p) : conFoto).filter((p) => !!p.photo),
    [hayFiltro, lista, conFoto],
  );

  return {
    slugPedido,
    toast,
    confirm,
    dialog,
    puedeEditar,
    perfiles,
    setPerfiles,
    indice,
    setIndice,
    cargando,
    setCargando,
    guardando,
    setGuardando,
    publicando,
    setPublicando,
    subiendo,
    setSubiendo,
    lote,
    setLote,
    guias,
    setGuias,
    verS3,
    setVerS3,
    verCategorias,
    setVerCategorias,
    conDominio,
    setConDominio,
    cambiarDominio,
    buscar,
    setBuscar,
    filtroEstado,
    setFiltroEstado,
    filtroSubida,
    setFiltroSubida,
    qr,
    setQr,
    sucio,
    setSucio,
    archivo,
    ajustes,
    setAjustes,
    perfil,
    lineaPorDefecto,
    slug,
    cambiar,
    speakers,
    unSpeaker,
    tamTitulo,
    guardar,
    publicar,
    reiniciar,
    reemplazarFoto,
    conFoto,
    sinFoto,
    republicarTodas,
    cambiarTrack,
    lista,
    hayFiltro,
    objetivoLote,
    posicion,
    irA,
    cuenta,
    subidas,
  };
}

export type Estado = ReturnType<typeof useCanvas>;

/** El estado cuando ya hay una persona elegida. */
export type Vista = Omit<Estado, "perfil"> & { perfil: CanvasProfile; sinCategoria: boolean };
