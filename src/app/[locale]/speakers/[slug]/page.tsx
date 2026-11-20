import { notFound } from "next/navigation";
import { getPublicSpeakerBySlug } from "@/lib/data/speakers";
import { getAgendaEvents } from "@/lib/data/agenda";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PerfilSpeaker } from "./_perfil";
import type { Metadata } from "next";
import { EVENTO, PAIS, SITIO } from "@/config";

export const revalidate = 300;

// Sin esto la ruta es dinámica y revalidate no aplica: cada perfil se genera
// en la primera visita y se sirve en caché.
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicSpeakerBySlug(slug);
  if (!profile) return {};
  return {
    title: profile.name,
    description: profile.bio || profile.talkTitle,
    openGraph: {
      title: profile.name,
      description: profile.bio || profile.talkTitle,
      images: [`/api/og/speaker/${slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title: profile.name,
      images: [`/api/og/speaker/${slug}`],
    },
  };
}

function formatSessionTime(iso: string | Date) {
  try {
    return new Date(iso).toLocaleTimeString(PAIS.locale, {
      timeZone: EVENTO.zona,
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return ""; }
}

export default async function SpeakerProfilePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const profile = await getPublicSpeakerBySlug(slug);
  if (!profile) notFound();

  // La hora y la sala salen del bloque de la agenda cuando ya está agendado.
  let horaFin: string | null = null;
  let sala: string | null = null;
  if (profile.sessionId) {
    const bloque = (await getAgendaEvents()).find((e) => e._id === String(profile.sessionId));
    horaFin = bloque?.endTime ?? null;
    sala = bloque?.room ?? null;
  }

  const inicio = profile.scheduledAt ? formatSessionTime(profile.scheduledAt) : "";
  const hora = inicio ? (horaFin ? `${inicio} – ${horaFin}` : inicio) : undefined;

  const appUrl = SITIO;

  return (
    <main className="min-h-svh bg-surface-900 px-5 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href={locale === "en" ? "/en/directorio" : "/directorio"}
          className="mb-8 inline-flex min-h-10 items-center gap-2 border-2 border-surface-600 px-3 font-mono text-xs font-bold text-surface-300 transition-colors hover:border-acento hover:text-acento"
        >
          <ArrowLeft className="h-4 w-4" />
          Directorio
        </Link>

        <PerfilSpeaker
          persona={{
            nombre: profile.name,
            foto: profile.photo,
            tagline: profile.tagline || profile.role,
            bio: profile.bio,
            social: profile.social,
          }}
          acompanantes={(profile.coSpeakers ?? []).map((c) => ({
            nombre: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
            foto: c.photo,
            tagline: c.tagline || c.role,
            bio: c.bio,
            social: c.social,
          }))}
          track={profile.track}
          trackLabel={(profile.track ?? "").replace(/-/g, " ")}
          talkTitle={profile.talkTitle}
          talkAbstract={profile.talkAbstract}
          hora={hora}
          sala={sala ?? undefined}
          countryCity={profile.countryCity}
          cardUrl={`${appUrl}/api/og/speaker/${slug}`}
          profileUrl={`${appUrl}/speakers/${slug}`}
          slug={slug}
        />
      </div>
    </main>
  );
}
