"use client";

import { use } from "react";
import { PasaporteVista } from "./_vista";

export default function PasaportePage({ params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = use(params);
  return <PasaporteVista shortId={shortId} />;
}
