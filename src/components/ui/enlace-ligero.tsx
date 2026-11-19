"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useModesto } from "@/hooks/use-modesto";

/** `next/link` que no precarga en dispositivos modestos. */
export function EnlaceLigero({ prefetch, ...props }: ComponentProps<typeof Link>) {
  const modesto = useModesto();
  return <Link {...props} prefetch={modesto ? false : prefetch} />;
}
