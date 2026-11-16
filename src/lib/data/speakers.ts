import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import { SpeakerProfile } from "@/models/speaker-profile";
import { Setting } from "@/models/setting";
// Side-effect import para registrar el schema de Room (lo usa populate)
import "@/models/room";
import type { ISpeakerProfile } from "@/models/speaker-profile";
import type { PublicProfile } from "@/components/sections/speakers";

export const SPEAKERS_TAG = "speakers";

type SortMode =
  | "approval_date" | "name_asc" | "name_desc"
  | "lastname_asc" | "lastname_desc" | "international_first" | "custom";

function buildSort(mode: SortMode): Record<string, 1 | -1> {
  switch (mode) {
    case "name_asc":            return { name: 1 };
    case "name_desc":           return { name: -1 };
    case "lastname_asc":        return { name: 1 };
    case "lastname_desc":       return { name: -1 };
    case "custom":              return { sortOrder: 1, createdAt: 1 };
    case "international_first":  return { speakerType: -1, sortOrder: 1, name: 1 };
    case "approval_date":
    default:                    return { createdAt: 1 };
  }
}

const SELECT_FIELDS =
  "name slug role tagline photo companyLogo social track sessionType countryCity talkTitle language audienceLevel roomId scheduledAt speakerType sortOrder coSpeakers.firstName coSpeakers.lastName coSpeakers.role coSpeakers.tagline coSpeakers.company coSpeakers.companyLogo coSpeakers.bio coSpeakers.photo coSpeakers.countryCity coSpeakers.social";

// Lista pública de speakers publicados, cacheada (invalida con revalidateTag(SPEAKERS_TAG)).
export const getPublicSpeakers = unstable_cache(
  async (): Promise<PublicProfile[]> => {
    await connectDB();

    const sortSetting = await Setting.findOne({ key: "speaker_sort" }).lean<{ value?: string } | null>();
    const sortMode = (sortSetting?.value as SortMode) ?? "approval_date";

    const raw = await SpeakerProfile.find({ isPublic: true })
      .select(SELECT_FIELDS)
      .populate<{ roomId: { name: string } | null }>({ path: "roomId", select: "name" })
      .sort(buildSort(sortMode))
      .lean();

    const profiles = raw.map((p) => {
      const { roomId, ...rest } = p as typeof p & { roomId?: { name: string } | null };
      return { ...rest, room: roomId?.name ?? null };
    });

    // Convierte cualquier ObjectId de subdocumentos a string
    return JSON.parse(JSON.stringify(profiles)) as PublicProfile[];
  },
  ["public-speakers"],
  { tags: [SPEAKERS_TAG], revalidate: 120 },
);

export type PerfilPublicoDTO = Pick<
  ISpeakerProfile,
  "name" | "slug" | "role" | "tagline" | "bio" | "photo" | "social" | "track" | "talkTitle" | "talkAbstract" | "countryCity"
> & {
  scheduledAt?: string | null;
  sessionId?: string | null;
  coSpeakers: Pick<ISpeakerProfile["coSpeakers"][number], "firstName" | "lastName" | "role" | "tagline" | "bio" | "photo" | "social">[];
};

const CAMPOS_PERFIL =
  "name slug role tagline bio photo social track talkTitle talkAbstract countryCity scheduledAt sessionId coSpeakers.firstName coSpeakers.lastName coSpeakers.role coSpeakers.tagline coSpeakers.bio coSpeakers.photo coSpeakers.social";

const leerPerfilPublico = unstable_cache(
  async (slug: string): Promise<PerfilPublicoDTO | null> => {
    await connectDB();
    const perfil = await SpeakerProfile.findOne({ slug, isPublic: true }).select(CAMPOS_PERFIL).lean();
    // Serializable: la caché de datos no admite ObjectId ni Date.
    return perfil ? (JSON.parse(JSON.stringify(perfil)) as PerfilPublicoDTO) : null;
  },
  ["public-speaker-by-slug"],
  { tags: [SPEAKERS_TAG], revalidate: 120 },
);

// Perfil público por slug: caché de datos + `cache()` para que metadata y página compartan la lectura.
export const getPublicSpeakerBySlug = cache((slug: string) => leerPerfilPublico(slug));
