import { Schema, model, models, Document } from "mongoose";

export interface IEventConfig extends Document {
  trackVirtualUrl: string;
  photosUrl: string;
  recordingsUrl: string;
  notifyUrl: string;
  showSponsorsCta: boolean;
  showSpeakerCta: boolean;

  /** Si la tarjeta de speaker lleva el dominio bajo el QR. */
  tarjetaDominio: boolean;

  /** Los enlaces operativos, por clave del catálogo de `@/data/enlaces`. */
  enlaces: Record<string, string>;
}

const schema = new Schema<IEventConfig>(
  {
    trackVirtualUrl:  { type: String,   default: "" },
    photosUrl:        { type: String,   default: "" },
    recordingsUrl:    { type: String,   default: "" },
    notifyUrl:    { type: String,   default: "" },
    showSponsorsCta:  { type: Boolean,  default: true },
    showSpeakerCta:   { type: Boolean,  default: true },
    tarjetaDominio:   { type: Boolean,  default: true },
    // Mapa suelto: las claves las valida `sanearEnlaces` contra el catálogo.
    enlaces:          { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const EventConfig = models.EventConfig || model<IEventConfig>("EventConfig", schema);
