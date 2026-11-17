"use client";

import { Loader2, X, Check, Pencil, Eye } from "lucide-react";
import type { Vista } from "./_use-pasaporte";
import { SOCIAL_PLATFORMS } from "./_social";
import { Perf } from "./_piezas";

export function Redes({ v }: { v: Vista }) {
  const { passport, isOwner, editingSocial, setEditingSocial, socialDraft, setSocialDraft, savingSocial, socialSaved, pendingFields, pendingEmail, unverified, recordClick, handleSaveSocial, openAddSocial, t, activeSocials } = v;
  return (
    <>
      {/* === SOCIAL (visitantes: solo lectura) === */}
      {!isOwner && (
        <div style={{ padding: "14px 18px" }}>
          <p style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.35em", color: "#374151", textTransform: "uppercase", margin: "0 0 10px" }}>
            {t("connect")}
          </p>
          {activeSocials.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {activeSocials.map((plat) => (
                <a
                  key={plat.id}
                  href={plat.urlFn(passport.social?.[plat.id] ?? "")}
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => recordClick(plat.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: plat.bg, color: "#fff", fontFamily: "monospace", fontSize: 11, fontWeight: 600, textDecoration: "none", transition: "filter .15s, transform .15s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.filter = "brightness(1.15)"; el.style.transform = "scale(1.02)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.filter = ""; el.style.transform = ""; }}
                >
                  {plat.icon}
                  {plat.label}
                </a>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: "monospace", fontSize: 11, color: "#1f2937", textAlign: "center", padding: "6px 0" }}>
              {t("no_social")}
            </p>
          )}
        </div>
      )}

      {/* === OWNER: REDES (editar donde se ven) === */}
      {isOwner && (
        <>
          <Perf />
          <div style={{ padding: "14px 18px", background: "rgb(var(--tema-acento-rgb) / .025)" }}>
            {/* Header con toggle Editar / Ver */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", color: "rgb(var(--tema-acento-rgb) / .65)", textTransform: "uppercase", margin: 0 }}>
                {t("my_social")}
              </p>
              {!editingSocial ? (
                <button onClick={() => setEditingSocial(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1px solid rgb(var(--tema-acento-rgb) / .3)", background: "rgb(var(--tema-acento-rgb) / .08)", fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "var(--color-acento)", cursor: "pointer" }}>
                  <Pencil style={{ width: 11, height: 11 }} /> {t("edit")}
                </button>
              ) : (
                <button onClick={() => setEditingSocial(false)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", fontFamily: "monospace", fontSize: 10, color: "#6b7280", cursor: "pointer" }}>
                  <Eye style={{ width: 11, height: 11 }} /> {t("view")}
                </button>
              )}
            </div>

            {/* Banner: cambios pendientes de confirmar por correo */}
            {pendingFields.length > 0 && (
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgb(var(--tema-acento-rgb) / .08)", border: "1px solid rgb(var(--tema-acento-rgb) / .28)" }}>
                <p style={{ fontFamily: "monospace", fontSize: 10, color: "#FCD34D", margin: 0, lineHeight: 1.55 }}>
                  {t("pending_lead", { campos: pendingFields.join(", ") })}
                  {pendingEmail ? ` ${t("pending_mail", { correo: pendingEmail })}` : ` ${t("pending_check_mail")}`}
                </p>
              </div>
            )}

            {/* Banner: se aplicó sin verificar (sin correo en el registro) */}
            {unverified && pendingFields.length === 0 && (
              <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(148,163,184,.08)", border: "1px solid rgba(148,163,184,.25)" }}>
                <p style={{ fontFamily: "monospace", fontSize: 10, color: "#cbd5e1", margin: 0, lineHeight: 1.55 }}>
                  {t("unverified")}
                </p>
              </div>
            )}

            {!editingSocial ? (
              /* Vista: solo lectura */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SOCIAL_PLATFORMS.map((plat) => {
                  const val = socialDraft[plat.id] ?? "";
                  return val.trim() ? (
                    <a key={plat.id} href={plat.urlFn(val)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", textDecoration: "none", transition: "border-color .15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgb(var(--tema-acento-rgb) / .3)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,.07)"; }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: plat.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{plat.icon}</div>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9ca3af", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plat.atSign ? "@" : ""}{val}</span>
                    </a>
                  ) : (
                    <div key={plat.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, opacity: .3 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: plat.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{plat.icon}</div>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#374151" }}>—</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Edición: agregar / cambiar / quitar por red */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SOCIAL_PLATFORMS.map((plat) => {
                  const val = socialDraft[plat.id] ?? "";
                  return (
                    <div key={plat.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: plat.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{plat.icon}</div>
                      {val.trim() ? (
                        <>
                          <span style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plat.atSign ? "@" : ""}{val}</span>
                          <button onClick={() => openAddSocial(plat.id)} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", fontFamily: "monospace", fontSize: 10, color: "#9ca3af", cursor: "pointer", flexShrink: 0 }}>{t("change")}</button>
                          <button onClick={() => setSocialDraft((d) => ({ ...d, [plat.id]: "" }))} title={t("remove")} style={{ display: "flex", padding: 5, borderRadius: 8, border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.08)", color: "#fca5a5", cursor: "pointer", flexShrink: 0 }}><X style={{ width: 12, height: 12 }} /></button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontFamily: "monospace", fontSize: 11, color: "#4b5563" }}>{plat.label}</span>
                          <button onClick={() => openAddSocial(plat.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgb(var(--tema-acento-rgb) / .3)", background: "rgb(var(--tema-acento-rgb) / .08)", fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "var(--color-acento)", cursor: "pointer", flexShrink: 0 }}>{t("add")}</button>
                        </>
                      )}
                    </div>
                  );
                })}
                <button onClick={() => { void handleSaveSocial(); }} disabled={savingSocial} style={{ marginTop: 4, padding: "10px 0", borderRadius: 12, border: "none", background: "var(--color-acento)", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--color-surface-900)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: savingSocial ? .6 : 1, transition: "opacity .2s" }}>
                  {savingSocial ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : socialSaved ? <><Check style={{ width: 14, height: 14 }} />{t("saved")}</> : t("save")}
                </button>
              </div>
            )}
          </div>
        </>
      )}

    </>
  );
}
