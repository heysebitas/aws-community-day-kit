"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { pedirJson } from "@/lib/pedir-json";
import { SOCIAL_PLATFORMS, usernameFromLink, cleanUsername, type PassportData, type Sponsor, type SocialPlatformId, type calcular } from "./_social";

type RespuestaPasaporte = {
  passport?: PassportData; sponsors?: Sponsor[]; isOwner?: boolean;
  error?: string; pinError?: string; rateLimited?: boolean;
};
type RespuestaSello = { sponsorName?: string; error?: string };
type RespuestaRedes = { pending?: string[]; maskedEmail?: string; unverified?: boolean };

/** Estado de arranque; sirve para pintar la pantalla sin pedir nada (pruebas). */
export type Inicial = Partial<{
  passport: PassportData; sponsors: Sponsor[]; loading: boolean; notFound: boolean;
  isOwner: boolean; stampModal: boolean; editing: boolean; pin: boolean;
}>;

export function usePasaporte(shortId: string, inicial: Inicial = {}) {
  const t = useTranslations("Passport");
  const [passport, setPassport]   = useState<PassportData | null>(inicial.passport ?? null);
  const [sponsors, setSponsors]   = useState<Sponsor[]>(inicial.sponsors ?? []);
  const [loading, setLoading]     = useState(inicial.loading ?? true);
  const [notFound, setNotFound]   = useState(inicial.notFound ?? false);

  const [isOwner, setIsOwner]             = useState(inicial.isOwner ?? false);
  const [showPinSection, setShowPinSection] = useState(inicial.pin ?? false);
  const [pinDigits, setPinDigits]         = useState(["", "", "", ""]);
  const [pinError, setPinError]           = useState<string | null>(null);
  const [pinBlocked, setPinBlocked]       = useState(false);
  const [verifyingPin, setVerifyingPin]   = useState(false);

  const [showStampModal, setShowStampModal] = useState(inicial.stampModal ?? false);
  const [stampDigits, setStampDigits]       = useState(["", "", "", ""]);
  const [stamping, setStamping]             = useState(false);
  const [stampResult, setStampResult]       = useState<{ ok: boolean; msg: string } | null>(null);

  const [editingSocial, setEditingSocial] = useState(inicial.editing ?? false);
  const [socialDraft, setSocialDraft]     = useState<Partial<Record<SocialPlatformId, string>>>({});
  const [savingSocial, setSavingSocial]   = useState(false);
  const [socialSaved, setSocialSaved]     = useState(false);
  const [addingPlatform, setAddingPlatform] = useState<SocialPlatformId | null>(null);
  const [addMode, setAddMode]             = useState<"username" | "link">("username");
  const [addInput, setAddInput]           = useState("");
  const [addError, setAddError]           = useState<string | null>(null);
  const [pendingFields, setPendingFields] = useState<string[]>([]);
  const [pendingEmail, setPendingEmail]   = useState<string | null>(null);
  const [unverified, setUnverified]       = useState(false);

  const viewTracked = useRef(false);

  const cookieKey = `pp_owner_${shortId}`;
  function saveOwnerCookie(p: string) { document.cookie = `${cookieKey}=${p}; max-age=${24*3600}; SameSite=Strict; path=/`; }
  function readOwnerCookie() { const m = document.cookie.match(new RegExp(`(?:^|; )${cookieKey}=([^;]*)`)); return m ? m[1] : null; }
  function clearOwnerCookie() { document.cookie = `${cookieKey}=; max-age=0; path=/`; }

  const loadPassport = useCallback(async (withPin?: string) => {
    try {
      const res  = await pedirJson<RespuestaPasaporte>(`/api/passport/${shortId}${withPin ? `?pin=${withPin}` : ""}`);
      const data = res.data;
      if (res.status === 404 || res.status === 0) { setNotFound(true); return; }
      if (data.passport) {
        setPassport(data.passport);
        setSponsors(data.sponsors ?? []);
        if (data.isOwner) {
          setIsOwner(true);
          if (withPin) saveOwnerCookie(withPin);
          const s = data.passport.social ?? {};
          setSocialDraft({ builderCenter: s.builderCenter ?? "", linkedin: s.linkedin ?? "", instagram: s.instagram ?? "", x: s.x ?? "", github: s.github ?? "", tiktok: s.tiktok ?? "" });
        }
      }
      if (res.status === 429 || data.rateLimited) { setPinBlocked(true); setPinError(data.error ?? t("too_many")); }
      else if (withPin && !data.isOwner && data.pinError) { setPinError(data.pinError); if (data.rateLimited) { setPinBlocked(true); clearOwnerCookie(); } }
    } catch { setNotFound(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- depende del pasaporte pedido; t y los setters no deben relanzarla
  }, [shortId]);

  useEffect(() => {
    (async () => { setLoading(true); await loadPassport(readOwnerCookie() ?? undefined); setLoading(false); })();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo otro pasaporte vuelve a cargar
  }, [shortId]);

  useEffect(() => { if (isOwner) setShowPinSection(false); }, [isOwner]);

  /* ── Stat helpers — cookie-gated to prevent trivial inflation ── */
  function statCookieKey(type: string) { return `pp_stat_${type}_${shortId}`; }
  function hasStatCookie(type: string) {
    return document.cookie.includes(`${statCookieKey(type)}=1`);
  }
  function setStatCookie(type: string, maxAgeS: number) {
    document.cookie = `${statCookieKey(type)}=1; max-age=${maxAgeS}; SameSite=Strict; path=/`;
  }

  /* ── Track view (non-owners, once per 24 h per device) ── */
  useEffect(() => {
    if (passport && !isOwner && !viewTracked.current) {
      viewTracked.current = true;
      if (hasStatCookie("view")) return;           // already counted on this device today
      setStatCookie("view", 24 * 3600);
      void pedirJson(`/api/passport/${shortId}/stats`, { method: "POST", body: { event: "view" } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- el flag viewTracked evita contar la visita dos veces
  }, [passport, isOwner, shortId]);

  function recordClick(platform: string) {
    const key = `click_${platform}`;
    if (hasStatCookie(key)) return;                // already counted this platform this hour
    setStatCookie(key, 3600);
    void pedirJson(`/api/passport/${shortId}/stats`, { method: "POST", body: { event: "click", platform } });
  }

  /* ── Stamp auto-submit when 4 digits filled ── */
  useEffect(() => {
    if (stampDigits.join("").length === 4 && !stamping && showStampModal) {
      void handleStampAuto(stampDigits.join(""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- se dispara al completar los dígitos, no cuando cambia el resto del estado
  }, [stampDigits]);

  async function handleStampAuto(pin: string) {
    setStamping(true); setStampResult(null);
    try {
      const res  = await pedirJson<RespuestaSello>(`/api/passport/${shortId}/stamp`, { method: "POST", body: { pin } });
      const data = res.data;
      if (res.status === 0) { setStampResult({ ok: false, msg: t("connection_error") }); setStampDigits(["","","",""]); return; }
      if (res.ok) {
        setStampResult({ ok: true, msg: t("stamp_added", { sponsor: data.sponsorName ?? "" }) });
        const sv = readOwnerCookie(); if (sv) await loadPassport(sv);
        setTimeout(() => { setShowStampModal(false); setStampResult(null); setStampDigits(["","","",""]); }, 2000);
      } else {
        setStampResult({ ok: false, msg: data.error || "PIN incorrecto" });
        setStampDigits(["","","",""]);
      }
    } catch { setStampResult({ ok: false, msg: t("connection_error") }); setStampDigits(["","","",""]); }
    finally { setStamping(false); }
  }

  async function verifyPin(pin: string) {
    if (pin.length < 4 || verifyingPin || pinBlocked) return;
    setVerifyingPin(true); setPinError(null);
    await loadPassport(pin);
    setVerifyingPin(false);
    // si sigue sin ser owner (PIN malo), la sección queda abierta para reintentar
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    await verifyPin(pinDigits.join(""));
  }

  /* ── PIN auto-desbloqueo al completar 4 dígitos (igual que recolectar un sello) ── */
  useEffect(() => {
    if (pinDigits.join("").length === 4 && !verifyingPin && !pinBlocked && showPinSection && !isOwner) {
      void verifyPin(pinDigits.join(""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- se dispara al completar los dígitos, no cuando cambia el resto del estado
  }, [pinDigits]);

  async function handleStamp(e: React.FormEvent) {
    e.preventDefault();
    const p = stampDigits.join("");
    if (p.length < 4 || stamping) return;
    setStamping(true); setStampResult(null);
    try {
      const res  = await pedirJson<RespuestaSello>(`/api/passport/${shortId}/stamp`, { method: "POST", body: { pin: p } });
      const data = res.data;
      if (res.status === 0) { setStampResult({ ok: false, msg: t("connection_error") }); return; }
      if (res.ok) { setStampResult({ ok: true, msg: t("stamp_added", { sponsor: data.sponsorName ?? "" }) }); setStampDigits(["","","",""]); const sv = readOwnerCookie(); if (sv) await loadPassport(sv); }
      else        { setStampResult({ ok: false, msg: data.error || t("redeem_error") }); setStampDigits(["","","",""]); }
    } catch { setStampResult({ ok: false, msg: t("connection_error") }); }
    finally { setStamping(false); }
  }

  async function handleSaveSocial() {
    const savedPin = readOwnerCookie(); if (!savedPin) return;
    setSavingSocial(true);
    try {
      const res = await pedirJson<RespuestaRedes>(`/api/passport/${shortId}`, { method: "PATCH", body: { pin: savedPin, social: socialDraft } });
      const data = res.data;
      if (res.ok) {
        setSocialSaved(true); setTimeout(() => setSocialSaved(false), 3000);
        // Las adiciones se aplican al instante; las ediciones quedan pendientes (Bloque C)
        if (Array.isArray(data.pending) && data.pending.length > 0) {
          setPendingFields(data.pending as string[]);
          setPendingEmail(typeof data.maskedEmail === "string" ? data.maskedEmail : null);
          setUnverified(false);
        } else {
          setPendingFields([]); setPendingEmail(null);
          setUnverified(data.unverified === true);
        }
        const sv = readOwnerCookie(); if (sv) await loadPassport(sv);
      }
    } finally { setSavingSocial(false); }
  }

  function openAddSocial(id: SocialPlatformId) {
    setAddingPlatform(id); setAddMode("username"); setAddInput(""); setAddError(null);
  }
  function submitAddSocial() {
    if (!addingPlatform) return;
    const plat = SOCIAL_PLATFORMS.find((p) => p.id === addingPlatform)!;
    let username: string | null;
    if (addMode === "link") {
      username = usernameFromLink(plat, addInput);
      if (!username) { setAddError(t("bad_link", { platform: plat.label })); return; }
    } else {
      username = cleanUsername(addInput);
      if (!username) { setAddError(t("bad_user")); return; }
    }
    setSocialDraft((d) => ({ ...d, [addingPlatform]: username! }));
    setAddingPlatform(null);
  }

  return {
    passport,
    setPassport,
    sponsors,
    setSponsors,
    loading,
    setLoading,
    notFound,
    setNotFound,
    isOwner,
    setIsOwner,
    showPinSection,
    setShowPinSection,
    pinDigits,
    setPinDigits,
    pinError,
    setPinError,
    pinBlocked,
    setPinBlocked,
    verifyingPin,
    setVerifyingPin,
    showStampModal,
    setShowStampModal,
    stampDigits,
    setStampDigits,
    stamping,
    setStamping,
    stampResult,
    setStampResult,
    editingSocial,
    setEditingSocial,
    socialDraft,
    setSocialDraft,
    savingSocial,
    setSavingSocial,
    socialSaved,
    setSocialSaved,
    addingPlatform,
    setAddingPlatform,
    addMode,
    setAddMode,
    addInput,
    setAddInput,
    addError,
    setAddError,
    pendingFields,
    setPendingFields,
    pendingEmail,
    setPendingEmail,
    unverified,
    setUnverified,
    viewTracked,
    cookieKey,
    saveOwnerCookie,
    readOwnerCookie,
    clearOwnerCookie,
    loadPassport,
    statCookieKey,
    hasStatCookie,
    setStatCookie,
    recordClick,
    handleStampAuto,
    verifyPin,
    handleVerifyPin,
    handleStamp,
    handleSaveSocial,
    openAddSocial,
    submitAddSocial,
    shortId,
    t,
  };
}

export type Estado = ReturnType<typeof usePasaporte>;

/** El estado con el pasaporte ya cargado y lo calculado a partir de él. */
export type Vista = Omit<Estado, "passport"> & { passport: PassportData } & ReturnType<typeof calcular>;
