"use client";

import { Suspense } from "react";
import { Cargando } from "@/components/admin/ui";
import { CanvasEditor } from "./_editor";

/** El editor de tarjetas. */
export default function CanvasEditorPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <CanvasEditor />
    </Suspense>
  );
}
