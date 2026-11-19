"use client";

import Link from "next/link";
import { EVENTO } from "@/config";
import { usePasaporte, type Inicial, type Vista } from "./_use-pasaporte";
import { calcular } from "./_social";
import { ANIM_CSS } from "./_piezas";
import { PinOverlay, Cabecera, Sellos } from "./_tarjeta";
import { Redes } from "./_redes";
import { ModalSello, ModalRedes } from "./_modales";

export function PasaporteVista({ shortId, inicial }: { shortId: string; inicial?: Inicial }) {
  const s = usePasaporte(shortId, inicial);
  const { loading, notFound, passport, t } = s;

  /* ── States ── */
  if (loading) return (
    <>
      <style>{ANIM_CSS}</style>
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-900)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "var(--color-acento)", animation: "spin 1s linear infinite", margin: "0 auto 14px" }} />
          <p style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.3em", color: "#9ca3af", textTransform: "uppercase" }}>{t("loading")}</p>
        </div>
      </div>
    </>
  );

  if (notFound) return (
    <>
      <style>{ANIM_CSS}</style>
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-900)" }}>
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <p style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "var(--color-surface-50)", marginBottom: 8 }}>{t("not_found")}</p>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-surface-400)" }}>{t("not_found_hint")}</p>
        </div>
      </div>
    </>
  );

  if (!passport) return null;

  const v: Vista = { ...s, passport, ...calcular(passport, s.sponsors, shortId) };

  return (
    <>
      <style>{ANIM_CSS}</style>

      {/* ═══ PAGE SHELL ═══ */}
      <main style={{ minHeight: "100svh", background: "var(--color-surface-900)", overflowX: "hidden", paddingBottom: 64 }}>

        {/* Ambient glow — orange top */}
        <div style={{ position: "fixed", top: "12%", left: "50%", width: 520, height: 420, pointerEvents: "none", background: "radial-gradient(ellipse at center, rgb(var(--tema-acento-rgb) / .065) 0%, transparent 68%)", animation: "breathe 5s ease-in-out infinite" }} />
        {/* Ambient glow — indigo bottom-right */}
        <div style={{ position: "fixed", bottom: "8%", right: "-8%", width: 380, height: 300, pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(99,102,241,.04) 0%, transparent 68%)" }} />
        {/* Dot grid */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle, rgb(var(--tema-acento-rgb) / .04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* ═══ CARD AREA ═══ */}
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "28px 16px 0", animation: "fade-up .55s ease forwards" }}>

          {/* ── HOLOGRAPHIC BORDER ── */}
          <div style={{
            padding: "1.5px", borderRadius: 26,
            background: "linear-gradient(135deg, var(--color-acento) 0%, #FCD34D 25%, #818cf8 50%, #34d399 75%, var(--color-acento) 100%)",
            backgroundSize: "300% 300%",
            animation: "gradient-border 4s ease infinite",
            boxShadow: "0 32px 80px rgba(0,0,0,.75), 0 0 0 1px rgb(var(--tema-acento-rgb) / .08)",
          }}>

            {/* ── INNER CARD ── */}
            <div style={{ borderRadius: 25, background: "linear-gradient(160deg, #0d1018 0%, #131824 55%, #0d1018 100%)", overflow: "hidden", position: "relative" }}>

              <PinOverlay v={v} />
              <Cabecera v={v} />
              <Redes v={v} />
              <Sellos v={v} />

            </div>{/* /inner card */}
          </div>{/* /holographic border */}

          {/* Bottom logo — links to home */}
          <Link
            href="/"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginTop: 28, textDecoration: "none", opacity: .85, transition: "opacity .2s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = ".85"; }}
          >
            {EVENTO.marca.mascota && (
              <img src={EVENTO.marca.mascota} alt="" aria-hidden="true" style={{ height: 76, width: "auto", marginBottom: 4 }} />
            )}
            <img src="/images/logos/aws-logo.svg" alt="AWS" style={{ height: 32, width: "auto" }} />
            <p style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#9ca3af", margin: 0 }}>{EVENTO.marca.lineas.join(" ")}</p>
            <p style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: "0.25em", color: "#9ca3af", margin: 0 }}>{`${EVENTO.edicion} ${EVENTO.anio}`.toUpperCase()}</p>
          </Link>

        </div>{/* /card area */}
      </main>{/* /page */}

      <ModalSello v={v} />
      <ModalRedes v={v} />
    </>
  );
}
