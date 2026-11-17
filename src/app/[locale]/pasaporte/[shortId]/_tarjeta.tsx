"use client";

import { Settings, Loader2, Fingerprint, X } from "lucide-react";
import type { Vista } from "./_use-pasaporte";
import { ROLE_LABEL } from "./_social";
import { Perf, StampItem, PinDigits } from "./_piezas";

export function PinOverlay({ v }: { v: Vista }) {
  const { isOwner, showPinSection, setShowPinSection, pinDigits, setPinDigits, pinError, pinBlocked, verifyingPin, handleVerifyPin } = v;
  return (
    <>
      {/* === PIN OVERLAY — centered in card, light blur on background === */}
      {showPinSection && !isOwner && (
        <>
          {/* Dim + blur layer — blocks interaction with card content */}
          <div
            onClick={() => setShowPinSection(false)}
            style={{
              position: "absolute", inset: 0, zIndex: 15,
              background: "rgba(8,10,15,0.55)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
              borderRadius: 25,
            }}
          />
          {/* PIN panel — centered */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 20,
            width: "calc(100% - 48px)",
            background: "linear-gradient(160deg, #111520 0%, #161c2c 100%)",
            borderRadius: 20,
            border: "1px solid rgb(var(--tema-acento-rgb) / .22)",
            boxShadow: "0 16px 48px rgba(0,0,0,.7)",
            padding: "22px 20px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-acento)" }}>
                <Fingerprint style={{ width: 15, height: 15 }} />
                <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  {pinBlocked ? "Acceso bloqueado" : "PIN de propietario"}
                </span>
              </div>
              <button
                onClick={() => setShowPinSection(false)}
                style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", display: "flex", padding: 4 }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <form onSubmit={handleVerifyPin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <PinDigits digits={pinDigits} onChange={setPinDigits} hasError={!!pinError} disabled={pinBlocked || verifyingPin} />
              </div>
              {pinError && (
                <p style={{ fontFamily: "monospace", fontSize: 10, color: "#fca5a5", margin: 0, textAlign: "center" }}>{pinError}</p>
              )}
              {verifyingPin ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                  <Loader2 style={{ width: 18, height: 18, color: "var(--color-acento)", animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                <p style={{ fontFamily: "monospace", fontSize: 9, color: "#1f2937", margin: 0, textAlign: "center" }}>
                  {pinBlocked ? "Demasiados intentos, espera un momento" : "Se desbloquea automáticamente al completar el PIN"}
                </p>
              )}
            </form>
          </div>
        </>
      )}
    </>
  );
}

export function Cabecera({ v }: { v: Vista }) {
  const { passport, isOwner, setShowPinSection, setPinDigits, setPinError, t, roleStyle, avatarSrc } = v;
  return (
    <>
      {/* === HEADER === */}
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src="/images/logos/aws-logo.svg" alt="AWS" style={{ height: 32, width: "auto" }} />

        {/* Owner / settings toggle */}
        <button
          onClick={() => {
            if (isOwner) return;
            setShowPinSection((v) => { if (!v) { setPinDigits(["","","",""]); setPinError(null); } return !v; });
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 20, cursor: isOwner ? "default" : "pointer",
            border: isOwner ? "1px solid rgba(52,211,153,.45)" : "1px solid rgba(255,255,255,.3)",
            background: isOwner ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.1)",
            color: isOwner ? "#6ee7b7" : "var(--color-surface-50)",
            animation: isOwner ? "owner-pulse 2s ease-in-out infinite" : "none",
            transition: "all .2s",
          }}
          title={isOwner ? "Modo propietario activo" : "Editar mi pasaporte (PIN)"}
        >
          <Settings style={{ width: 15, height: 15 }} />
          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
            {isOwner ? "OWNER" : "Editar"}
          </span>
        </button>
      </div>

      {/* === AVATAR === */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 4, paddingBottom: 18 }}>
        <div style={{ position: "relative", display: "inline-flex" }}>
          {/* Outer pulse */}
          <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "1px solid rgb(var(--tema-acento-rgb) / .2)", animation: "pulse-ring 2.8s ease-out infinite" }} />
          {/* Middle pulse (offset) */}
          <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: "1px solid rgb(var(--tema-acento-rgb) / .12)", animation: "pulse-ring 2.8s ease-out .9s infinite" }} />
          {/* Gradient ring */}
          <div style={{
            width: 112, height: 112, borderRadius: "50%", padding: 3,
            background: "linear-gradient(135deg, var(--color-acento), #FCD34D, var(--color-acento))",
            backgroundSize: "200% 200%",
            animation: "gradient-border 3s ease infinite",
          }}>
            <img src={avatarSrc} alt={`${passport.firstName} ${passport.lastName}`} style={{ width: "100%", height: "100%", borderRadius: "50%", display: "block" }} />
          </div>
        </div>
      </div>

      {/* === NAME === */}
      <div style={{ textAlign: "center", padding: "0 20px 8px" }}>
        <p style={{ fontSize: "clamp(1.875rem,8.5vw,2.75rem)", fontWeight: 900, color: "var(--color-surface-50)", letterSpacing: "-0.025em", lineHeight: .92, textTransform: "uppercase", margin: 0 }}>
          {passport.firstName}
        </p>
        <p style={{ fontSize: "clamp(1.875rem,8.5vw,2.75rem)", fontWeight: 900, color: "var(--color-acento)", letterSpacing: "-0.025em", lineHeight: .92, textTransform: "uppercase", margin: "1px 0 0", animation: "text-glow 3s ease-in-out infinite" }}>
          {passport.lastName}
        </p>

        {(passport.jobTitle || passport.company) && (
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "#4b5563", marginTop: 11, lineHeight: 1.5, margin: "11px 0 0" }}>
            {[passport.jobTitle, passport.company].filter(Boolean).join(" · ")}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <span style={{
            fontFamily: "monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.15em", textTransform: "uppercase",
            padding: "4px 13px", borderRadius: 20,
            background: roleStyle.bg, color: roleStyle.text,
            border: `1px solid ${roleStyle.border}`,
          }}>
            {ROLE_LABEL[passport.role] ? t(ROLE_LABEL[passport.role]!) : passport.role}
          </span>
        </div>
      </div>

      <Perf />

    </>
  );
}

export function Sellos({ v }: { v: Vista }) {
  const { sponsors, isOwner, setShowStampModal, setStampDigits, setStampResult, t, collectedIds, totalSponsors, totalCollected, progressPct, mrz1, mrz2 } = v;
  return (
    <>
      {/* === OWNER: STAMP CLAIM BUTTON (arriba de los sellos) === */}
      {isOwner && totalSponsors > 0 && (
        <>
          <Perf />
          <div style={{ padding: "14px 18px", background: "rgb(var(--tema-acento-rgb) / .025)" }}>
            <button
              onClick={() => { setShowStampModal(true); setStampDigits(["","","",""]); setStampResult(null); }}
              style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "1px solid rgb(var(--tema-acento-rgb) / .3)", background: "rgb(var(--tema-acento-rgb) / .08)", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--color-acento)", cursor: "pointer", letterSpacing: "0.08em" }}
            >
              {t("redeem")}
            </button>
          </div>
        </>
      )}

      {/* === STAMPS === */}
      {totalSponsors > 0 && (
        <>
          <Perf />
          <div style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.35em", color: "#374151", textTransform: "uppercase", margin: 0 }}>{t("stamps")}</p>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--color-acento)" }}>
                {totalCollected}<span style={{ color: "#1f2937", fontWeight: 400 }}> / {totalSponsors}</span>
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 3, background: "rgba(255,255,255,.05)", marginBottom: 14, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${progressPct}%`, background: "linear-gradient(90deg, var(--color-acento), #FCD34D)", boxShadow: "0 0 8px rgb(var(--tema-acento-rgb) / .4)", transition: "width .8s ease" }} />
            </div>
            {/*
              Con un número impar, el último se quedaba pegado a la
              izquierda con un hueco al lado. Ocupa las dos columnas y
              se centra, al mismo tamaño que los demás: la mitad de la
              fila menos la mitad del hueco.
            */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {sponsors.map((sp, i) => {
                const soloEnSuFila = i === sponsors.length - 1 && sponsors.length % 2 === 1;
                return (
                  <div
                    key={sp._id}
                    style={soloEnSuFila
                      ? { gridColumn: "1 / -1", width: "calc(50% - 5px)", margin: "0 auto" }
                      : undefined}
                  >
                    <StampItem sponsor={sp} collected={collectedIds.has(sp._id)} />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* === MRZ ZONE === */}
      <div style={{ borderTop:"1px solid rgb(var(--tema-acento-rgb) / .07)", padding:"11px 20px 13px", background:"rgba(0,0,0,.25)", textAlign:"center" }}>
        <p style={{ fontFamily:"'Courier New',monospace", fontSize:8, letterSpacing:"0.08em", color:"rgb(var(--tema-acento-rgb) / .16)", lineHeight:1.9, wordBreak:"break-all", margin:0, userSelect:"none" }}>
          {mrz1}<br />{mrz2}
        </p>
      </div>
    </>
  );
}
