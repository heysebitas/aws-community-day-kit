"use client";

import { motion } from "motion/react";
import { Code2, Globe, Clock, MapPin } from "lucide-react";
import { ShareButton } from "@/components/ui/share-modal";
import { cn } from "@/lib/utils";
import { NombreTecleado } from "./_nombre";

/** El perfil público de un speaker, en el lenguaje del sitio. */

export interface Social {
  linkedin?: string; twitter?: string; instagram?: string;
  github?: string; website?: string; blog?: string; facebook?: string;
}

export interface Persona {
  nombre: string;
  foto?: string;
  tagline?: string;
  bio?: string;
  social?: Social;
}

interface Props {
  persona: Persona;
  acompanantes: Persona[];
  track: string;
  trackLabel: string;
  talkTitle?: string;
  talkAbstract?: string;
  hora?: string;
  sala?: string;
  countryCity?: string;
  cardUrl: string;
  profileUrl: string;
  slug: string;
}

/** Entrada escalonada: cada bloque entra un pelo después del anterior. */
const entra = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: 0.15 + i * 0.09, ease: [0.22, 1, 0.36, 1] as const },
});

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.634zM17.083 20.25h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function urlAbsoluta(url: string) {
  if (!url) return url;
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** Los enlaces de redes, como bloques. */
function Redes({ social }: { social?: Social }) {
  if (!social) return null;
  const enlaces = [
    { url: social.linkedin, label: "LinkedIn", Icon: LinkedInIcon },
    { url: social.twitter, label: "X", Icon: XTwitterIcon },
    { url: social.instagram, label: "Instagram", Icon: InstagramIcon },
    { url: social.github, label: "GitHub", Icon: Code2 },
    { url: social.website || social.blog, label: "Web", Icon: Globe },
  ].filter((e) => !!e.url);

  if (!enlaces.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {enlaces.map(({ url, label, Icon }) => (
        <a
          key={label}
          href={urlAbsoluta(url!)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-10 items-center gap-2 border-2 border-surface-600 px-3 font-mono text-xs font-bold text-surface-200 transition-colors hover:border-acento hover:bg-acento hover:text-surface-900"
        >
          <Icon className="h-3.5 w-3.5" /> {label}
        </a>
      ))}
    </div>
  );
}

/** El retrato, con su marco y la sombra dura. */
function Retrato({ persona, grande }: { persona: Persona; grande?: boolean }) {
  const iniciales = persona.nombre.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border-2 border-acento bg-surface-800",
        grande
          ? "h-56 w-56 shadow-[8px_8px_0_0_rgb(var(--tema-acento-rgb)_/_0.35)] sm:h-64 sm:w-64"
          : "h-20 w-20",
      )}
    >
      {persona.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={persona.foto} alt={persona.nombre} className="h-full w-full object-cover object-top" />
      ) : (
        <span className={cn("flex h-full w-full items-center justify-center font-mono font-bold text-acento", grande ? "text-5xl" : "text-xl")}>
          {iniciales}
        </span>
      )}
    </div>
  );
}

export function PerfilSpeaker({
  persona, acompanantes, track, trackLabel,
  talkTitle, talkAbstract, hora, sala, countryCity,
  cardUrl, profileUrl, slug,
}: Props) {
  const sinCategoria = !track || track === "general";

  return (
    <>
      {/* ── EL NOMBRE ─────────────────────────────────────────────────────
          Ocupa el ancho entero y se escribe al entrar. Mismo tratamiento que
          el titular de la portada: tamaño atado a la ventana, interlineado
          corto, muy apretado. */}
      <div className="flex flex-col gap-6 border-b-2 border-surface-600 pb-8 sm:flex-row sm:items-end sm:gap-8">
        <motion.div {...entra(0)}>
          <Retrato persona={persona} grande />
        </motion.div>

        <div className="min-w-0 flex-1">
          {!sinCategoria && (
            <motion.p {...entra(1)} className="dot-matrix m-0 mb-2 text-lg leading-none text-acento">
              {trackLabel.toLowerCase()}
            </motion.p>
          )}

          <NombreTecleado
            texto={persona.nombre}
            className="font-display text-[11vw] font-medium lowercase leading-[0.85] tracking-tighter text-surface-50 sm:text-[7vw] lg:text-[4.6vw] xl:text-[64px]"
          />

          {persona.tagline && (
            <motion.p {...entra(2)} className="m-0 mt-3 font-mono text-sm font-bold text-acento sm:text-base">
              {persona.tagline}
            </motion.p>
          )}

          {countryCity && (
            <motion.p {...entra(3)} className="m-0 mt-1 flex items-center gap-1.5 font-mono text-xs text-surface-300">
              <MapPin className="h-3 w-3 shrink-0" />{countryCity}
            </motion.p>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ── LA CHARLA ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-8">
          <motion.section {...entra(4)}>
            <p className="dot-matrix m-0 mb-3 text-lg leading-none text-acento">la charla</p>
            <div className="border-2 border-surface-600 bg-surface-800 p-5 sm:p-6">
              <h2 className="m-0 font-display text-2xl font-medium lowercase leading-tight tracking-tight text-surface-50 sm:text-3xl">
                {talkTitle || "próximamente"}
              </h2>

              {(hora || sala) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {hora && (
                    <span className="flex items-center gap-2 border-2 border-acento bg-acento px-3 py-1.5 font-mono text-sm font-bold text-surface-900">
                      <Clock className="h-4 w-4 shrink-0" />{hora}
                    </span>
                  )}
                  {sala && (
                    <span className="flex items-center gap-2 border-2 border-acento px-3 py-1.5 font-mono text-sm font-bold text-acento">
                      <MapPin className="h-4 w-4 shrink-0" />{sala}
                    </span>
                  )}
                </div>
              )}

              {talkAbstract && (
                <p className="m-0 mt-5 whitespace-pre-line font-mono text-sm leading-relaxed text-surface-200">
                  {talkAbstract}
                </p>
              )}
            </div>
          </motion.section>

          {/* ── QUIÉN ES ──────────────────────────────────────────────────── */}
          {persona.bio && (
            <motion.section {...entra(5)}>
              {/* El bloque del tema invertido, como el pie del sitio. Uno solo, en la bio:
                  con dos bloques así la jerarquía se aplana. */}
              <div className="bg-acento p-5 text-tinta shadow-[8px_8px_0_0_rgb(var(--tema-acento-rgb)_/_0.25)] sm:p-6">
                <p className="dot-matrix m-0 mb-3 text-lg leading-none text-tinta">quién es</p>
                <p className="m-0 whitespace-pre-line font-mono text-sm leading-relaxed text-tinta/85">
                  {persona.bio}
                </p>
              </div>
            </motion.section>
          )}

          {/* ── ACOMPAÑANTES ──────────────────────────────────────────────── */}
          {acompanantes.length > 0 && (
            <motion.section {...entra(6)}>
              <p className="dot-matrix m-0 mb-3 text-lg leading-none text-acento">
                {acompanantes.length === 1 ? "presenta con" : "presentan con"}
              </p>
              <div className="flex flex-col gap-3">
                {acompanantes.map((c, i) => (
                  <div key={i} className="flex items-start gap-4 border-2 border-surface-600 bg-surface-800 p-3">
                    <Retrato persona={c} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-mono text-sm font-bold text-surface-50">{c.nombre}</p>
                      {c.tagline && <p className="m-0 mt-0.5 font-mono text-xs text-acento">{c.tagline}</p>}
                      {c.bio && (
                        <p className="m-0 mt-1.5 line-clamp-3 font-mono text-xs leading-relaxed text-surface-300">
                          {c.bio}
                        </p>
                      )}
                      <div className="mt-2"><Redes social={c.social} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        {/* ── LA COLUMNA DE AL LADO ─────────────────────────────────────── */}
        <div className="flex flex-col gap-8">
          <motion.section {...entra(5)}>
            <p className="dot-matrix m-0 mb-3 text-lg leading-none text-acento">dónde encontrarle</p>
            <Redes social={persona.social} />
          </motion.section>

          <motion.section {...entra(6)}>
            <p className="dot-matrix m-0 mb-3 text-lg leading-none text-acento">su tarjeta</p>
            {/* La tarjeta se apoya en un bloque del tema que sobresale, para que se lea como un objeto y no como una imagen más. */}
            <div className="bg-acento p-3">
              <div className="border-2 border-tinta shadow-[6px_6px_0_0_rgba(0,0,0,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cardUrl} alt={`Tarjeta de ${persona.nombre}`} className="block w-full" />
              </div>
            </div>
            <div className="mt-3">
              <ShareButton
                name={persona.nombre}
                talkTitle={talkTitle}
                profileUrl={profileUrl}
                cardUrl={cardUrl}
                slug={slug}
              />
            </div>
          </motion.section>
        </div>
      </div>
    </>
  );
}
