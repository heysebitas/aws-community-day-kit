"use client";

import { POS, TRI } from "@/data/plane-model";
import { LowPoly } from "./low-poly";

/** El avión de la pantalla de confirmación. */
export function Plane({ size = 420, className }: { size?: number; className?: string }) {
  return <LowPoly pos={POS} tri={TRI} size={size} className={className} />;
}
