"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { cn, localePath } from "@/lib/utils";
import { useEventConfig } from "@/components/providers/event-config-provider";
import { navItems } from "@/data/navigation";
import { LanguageToggle } from "./language-toggle";
import { Marca } from "./marca";
import { MobileNav } from "./mobile-nav";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";

function ScrambleLink({ text, href }: { text: string; href: string }) {
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const handleEnter = useCallback(() => {
    let iteration = 0;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplay(
        text.split("").map((char, i) => (i < iteration ? char : CHARS[Math.floor(Math.random() * CHARS.length)])).join("")
      );
      iteration += 1 / 2;
      if (iteration >= text.length) {
        clearInterval(intervalRef.current);
        setDisplay(text);
      }
    }, 30);
  }, [text]);

  const handleLeave = () => {
    clearInterval(intervalRef.current);
    setDisplay(text);
  };

  return (
    <a
      href={href}
      className="font-mono text-sm text-surface-200 transition-colors hover:text-acento"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {display}
    </a>
  );
}

export function Navbar() {
  const t = useTranslations("Nav");
  const { attendeeOpen } = useEventConfig();
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const openingRef = useRef(false);

  const handleOpenMenu = () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setMobileOpen(true);
    setTimeout(() => { openingRef.current = false; }, 600);
  };

  const home = localePath(locale);
  const isHome = pathname === home || pathname === home + "/";
  // Un ancla (`#about`) sólo sirve tal cual en la portada; desde otra página lleva antes a ella.
  const resolveHref = (href: string) => {
    if (href.startsWith("/")) return localePath(locale, href);
    return isHome ? href : `${home === "/" ? "" : home}/${href}`;
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 border-b-2 bg-surface-900 transition-colors duration-300",
          scrolled ? "border-acento/40" : "border-acento/15",
        )}
      >
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href={resolveHref("#home")} className="mt-1 flex min-w-0 items-center">
            <Marca soloLogoEnMovil />
          </a>

          <div className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <ScrambleLink key={item.href} text={t(item.labelKey)} href={resolveHref(item.href)} />
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageToggle />
            {/* Con el registro cerrado deja de ser un enlace. */}
            {attendeeOpen ? (
              <a
                href={localePath(locale, "/registro")}
                className={cn(
                  "hidden items-center bg-acento px-6 py-2.5 text-surface-900 transition-all duration-200 sm:inline-flex",
                  "shadow-[4px_4px_0_0_var(--color-acento-fuerte)]",
                  "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--color-acento-fuerte)]",
                  "active:translate-x-0 active:translate-y-0 active:shadow-none",
                )}
              >
                <span className="etiqueta leading-none">{t("register")}</span>
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="hidden cursor-not-allowed items-center border-2 border-acento/40 px-6 py-2 text-acento/50 sm:inline-flex"
              >
                <span className="etiqueta leading-none">{t("register_closed")}</span>
              </span>
            )}
            <button
              onClick={handleOpenMenu}
              style={{ touchAction: "manipulation" }}
              className="flex h-10 w-10 items-center justify-center border-2 border-acento text-acento transition-colors hover:bg-acento hover:text-tinta lg:hidden"
              aria-label={t("open_menu")}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M4 7h16 M4 12h16 M4 17h16" stroke="currentColor" strokeWidth="2.4" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
