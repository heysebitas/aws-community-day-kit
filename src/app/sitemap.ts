import type { MetadataRoute } from "next";
import { IDIOMAS, IDIOMA_BASE, SITIO } from "@/config";
import { connectDB } from "@/lib/db";
import { localePath } from "@/lib/utils";
import { SpeakerProfile } from "@/models/speaker-profile";

export const dynamic = "force-dynamic";

type Frecuencia = "daily" | "weekly" | "monthly";

const RUTAS: Array<{ ruta: string; prioridad: number; frecuencia: Frecuencia; si?: boolean }> = [
  { ruta: "", prioridad: 1, frecuencia: "weekly" },
  { ruta: "/registro", prioridad: 0.95, frecuencia: "weekly" },
  { ruta: "/speakers", prioridad: 0.85, frecuencia: "weekly" },
  { ruta: "/directorio", prioridad: 0.8, frecuencia: "daily" },
  { ruta: "/voluntarios", prioridad: 0.75, frecuencia: "weekly" },
  { ruta: "/codigo-conducta", prioridad: 0.5, frecuencia: "monthly" },
  { ruta: "/privacidad", prioridad: 0.4, frecuencia: "monthly" },
];

const url = (idioma: string, ruta: string) => `${SITIO}${localePath(idioma, ruta)}`.replace(/\/$/, "") || SITIO;

/** Una entrada por idioma, cada una enlazando a sus traducciones. */
function entradas(ruta: string, prioridad: number, frecuencia: Frecuencia, ahora: Date): MetadataRoute.Sitemap {
  const idiomas = {
    ...Object.fromEntries(IDIOMAS.map((i) => [i, url(i, ruta)])),
    "x-default": url(IDIOMA_BASE, ruta),
  };
  return IDIOMAS.map((i) => ({
    url: url(i, ruta),
    lastModified: ahora,
    changeFrequency: frecuencia,
    // Las traducciones valen un poco menos que la versión en el idioma base.
    priority: i === IDIOMA_BASE ? prioridad : Math.round((prioridad - 0.05) * 100) / 100,
    alternates: { languages: idiomas },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ahora = new Date();

  let slugs: string[] = [];
  try {
    await connectDB();
    const perfiles = await SpeakerProfile.find({ isPublic: true }, { slug: 1 }).lean();
    slugs = perfiles.map((p) => p.slug as string).filter(Boolean);
  } catch {
    // Sin base (por ejemplo, al compilar) el mapa sale sin los perfiles.
  }

  return [
    ...RUTAS.filter((r) => r.si !== false).flatMap((r) => entradas(r.ruta, r.prioridad, r.frecuencia, ahora)),
    ...slugs.flatMap((s) => entradas(`/speakers/${s}`, 0.7, "weekly", ahora)),
  ];
}
