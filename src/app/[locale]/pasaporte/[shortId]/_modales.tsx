"use client";

import { Loader2, X } from "lucide-react";
import type { Vista } from "./_use-pasaporte";
import { SOCIAL_PLATFORMS, cleanUsername } from "./_social";
import { PinDigits } from "./_piezas";

export function ModalSello({ v }: { v: Vista }) {
  const { showStampModal, setShowStampModal, stampDigits, setStampDigits, stamping, stampResult, setStampResult, t } = v;
  return (
    <>
  {/* ═══ STAMP MODAL ═══ */}
  {showStampModal && (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 340, borderRadius: 22, overflow: "hidden", background: "linear-gradient(160deg, #111520, #161c2c)", border: "1px solid rgb(var(--tema-acento-rgb) / .2)", boxShadow: "0 24px 64px rgba(0,0,0,.8)" }}>
        <div style={{ height: 2, background: "linear-gradient(90deg,var(--color-acento),#FCD34D,var(--color-acento))", backgroundSize: "200% 200%", animation: "gradient-border 3s ease infinite" }} />
        <div style={{ padding: "22px 22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--color-acento)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>{t("redeem")}</p>
            <button aria-label={t("close")} onClick={() => { setShowStampModal(false); setStampDigits(["","","",""]); setStampResult(null); }} style={{ background: "none", border: "none", color: "var(--color-surface-400)", cursor: "pointer", display: "flex", padding: 4 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {stampResult ? (
            /* Result state */
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <p style={{ fontFamily: "monospace", fontSize: 12, color: stampResult.ok ? "#6ee7b7" : "#fca5a5", padding: "10px 16px", borderRadius: 12, background: stampResult.ok ? "rgba(52,211,153,.08)" : "rgba(239,68,68,.08)", border: `1px solid ${stampResult.ok ? "rgba(52,211,153,.2)" : "rgba(239,68,68,.2)"}` }}>
                {stampResult.msg}
              </p>
              {!stampResult.ok && (
                <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--color-surface-400)", marginTop: 10 }}>Intenta otro PIN</p>
              )}
            </div>
          ) : stamping ? (
            /* Loading state */
            <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
              <Loader2 style={{ width: 28, height: 28, color: "var(--color-acento)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            /* PIN entry — auto-submits on 4 digits */
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--color-surface-400)", textAlign: "center", margin: 0 }}>
                Ingresa el PIN del sponsor para reclamar tu sello
              </p>
              <PinDigits
                digits={stampDigits}
                onChange={(d) => { setStampDigits(d); setStampResult(null); }}
              />
              <p style={{ fontFamily: "monospace", fontSize: 9, color: "#1f2937", margin: 0 }}>
                Se envía automáticamente al completar los 4 dígitos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )}
    </>
  );
}

export function ModalRedes({ v }: { v: Vista }) {
  const { addingPlatform, setAddingPlatform, addMode, setAddMode, addInput, setAddInput, addError, setAddError, submitAddSocial, t } = v;
  return (
    <>
  {/* ═══ ADD/EDIT SOCIAL MODAL ═══ */}
  {addingPlatform && (() => {
    const plat = SOCIAL_PLATFORMS.find((p) => p.id === addingPlatform)!;
    const modeBtn = (active: boolean): React.CSSProperties => ({
      flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer",
      border: active ? "1px solid rgb(var(--tema-acento-rgb) / .5)" : "1px solid rgba(255,255,255,.1)",
      background: active ? "rgb(var(--tema-acento-rgb) / .12)" : "rgba(255,255,255,.03)",
      color: active ? "var(--color-acento)" : "#6b7280",
      fontFamily: "monospace", fontSize: 11, fontWeight: 700,
    });
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", padding: "0 24px" }}>
        <div style={{ width: "100%", maxWidth: 360, borderRadius: 22, overflow: "hidden", background: "linear-gradient(160deg, #111520, #161c2c)", border: "1px solid rgb(var(--tema-acento-rgb) / .2)", boxShadow: "0 24px 64px rgba(0,0,0,.8)" }}>
          <div style={{ height: 2, background: "linear-gradient(90deg,var(--color-acento),#FCD34D,var(--color-acento))" }} />
          <div style={{ padding: "20px 20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: plat.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{plat.icon}</div>
                <p style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--color-surface-50)", margin: 0 }}>{plat.label}</p>
              </div>
              <button aria-label={t("close")} onClick={() => setAddingPlatform(null)} style={{ background: "none", border: "none", color: "var(--color-surface-400)", cursor: "pointer", display: "flex", padding: 4 }}><X style={{ width: 14, height: 14 }} /></button>
            </div>

            <p style={{ fontFamily: "monospace", fontSize: 10, color: "#6b7280", margin: "0 0 10px" }}>{t("add_how")}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => { setAddMode("username"); setAddError(null); }} style={modeBtn(addMode === "username")}>{t("mode_user")}</button>
              <button onClick={() => { setAddMode("link"); setAddError(null); }} style={modeBtn(addMode === "link")}>{t("mode_link")}</button>
            </div>

            {addMode === "username" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
                  {plat.atSign && <span style={{ padding: "9px 0 9px 12px", fontFamily: "monospace", fontSize: 12, color: "var(--color-acento)", fontWeight: 700 }}>@</span>}
                  <input
                    autoFocus value={addInput}
                    onChange={(e) => { setAddInput(e.target.value); setAddError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitAddSocial(); }}
                    placeholder={t(plat.placeholder)}
                    style={{ flex: 1, padding: plat.atSign ? "9px 12px 9px 4px" : "9px 12px", border: "none", background: "transparent", fontFamily: "monospace", fontSize: 12, color: "#e5e7eb", outline: "none" }}
                  />
                </div>
                <p style={{ fontFamily: "monospace", fontSize: 9, color: "#374151", margin: "7px 0 0" }}>
                  {t("will_be", { url: `${plat.prefix}${addInput.trim() ? cleanUsername(addInput) ?? "…" : t(plat.placeholder)}` })}
                </p>
              </>
            ) : (
              <>
                <input
                  autoFocus type="url" value={addInput}
                  onChange={(e) => { setAddInput(e.target.value); setAddError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitAddSocial(); }}
                  placeholder={plat.urlFn(t(plat.placeholder))}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", fontFamily: "monospace", fontSize: 11, color: "#e5e7eb", outline: "none" }}
                />
                <p style={{ fontFamily: "monospace", fontSize: 9, color: "#374151", margin: "7px 0 0" }}>{t("paste_link", { plataforma: plat.label })}</p>
              </>
            )}

            {addError && <p style={{ fontFamily: "monospace", fontSize: 10, color: "#fca5a5", margin: "10px 0 0" }}>{addError}</p>}

            <button
              onClick={submitAddSocial}
              disabled={!addInput.trim()}
              style={{ width: "100%", marginTop: 16, padding: "11px 0", borderRadius: 12, border: "none", background: "var(--color-acento)", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--color-surface-900)", cursor: "pointer", opacity: addInput.trim() ? 1 : .4, transition: "opacity .2s" }}
            >
              {addMode === "link" ? t("validate_add") : t("add_short")}
            </button>
          </div>
        </div>
      </div>
    );
  })()}
    </>
  );
}
