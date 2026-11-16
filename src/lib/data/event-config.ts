import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import { EventConfig } from "@/models/event-config";
import { Form } from "@/models/form";
import { EVENTO } from "@/config";

// Tag para invalidar la caché cuando el admin edita la config
export const EVENT_CONFIG_TAG = "event-config";

// Lo que el sitio público necesita de la base. Los datos del equipo nunca
// salen por acá. `cfpOpen` va aparte porque depende del reloj: lo corrige el
// cliente con `cfpCierre`.
export type EventConfigDB = {
  trackVirtualUrl: string;
  photosUrl: string;
  recordingsUrl: string;
  notifyUrl: string;
  showSponsorsCta: boolean;
  showSpeakerCta: boolean;
  /** Si los formularios reciben respuestas. El de speakers no está: su cierre es una fecha de `evento/config.ts`. */
  attendeeOpen: boolean;
  volunteerOpen: boolean;
};

export type PublicEventConfig = EventConfigDB & {
  /** Valor al generar la página; el provider lo recalcula en el cliente con `cfpCierre`. */
  cfpOpen: boolean;
  /** Cierre de la convocatoria de speakers (`EVENTO.cfpCierre`). */
  cfpCierre: string;
};

// Lo que se usa si no hay documento o si la base falla, para que el sitio no se caiga.
export const EMPTY_PUBLIC_CONFIG: EventConfigDB = {
  trackVirtualUrl: "",
  photosUrl: "",
  recordingsUrl: "",
  notifyUrl: "",
  showSponsorsCta: true,
  showSpeakerCta: true,
  // Cerrados: si la base no responde es mejor no ofrecer una puerta que puede estar cerrada.
  attendeeOpen: false,
  volunteerOpen: false,
};

// Cacheada cinco minutos; se invalida con `revalidateTag(EVENT_CONFIG_TAG)` al guardar en el panel.
export const getPublicEventConfig = unstable_cache(
  async (): Promise<EventConfigDB> => {
    await connectDB();
    const [c, attendee, volunteer] = await Promise.all([
      EventConfig.findOne().lean<Record<string, unknown>>(),
      Form.findOne({ formType: "attendee" }).select("isOpen").lean<{ isOpen?: boolean }>(),
      Form.findOne({ formType: "volunteer" }).select("isOpen").lean<{ isOpen?: boolean }>(),
    ]);
    const formularios = {
      attendeeOpen: !!attendee?.isOpen,
      volunteerOpen: !!volunteer?.isOpen,
    };
    if (!c) return { ...EMPTY_PUBLIC_CONFIG, ...formularios };
    return {
      ...formularios,
      trackVirtualUrl: (c.trackVirtualUrl as string) || "",
      photosUrl: (c.photosUrl as string) || "",
      recordingsUrl: (c.recordingsUrl as string) || "",
      notifyUrl: (c.notifyUrl as string) || "",
      showSponsorsCta: typeof c.showSponsorsCta === "boolean" ? c.showSponsorsCta : true,
      showSpeakerCta: typeof c.showSpeakerCta === "boolean" ? c.showSpeakerCta : true,
    };
  },
  ["public-event-config"],
  { tags: [EVENT_CONFIG_TAG], revalidate: 300 },
);
