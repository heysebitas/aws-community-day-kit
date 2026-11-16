import type { Metadata } from "next";
import { metadatosDe } from "@/lib/metadatos";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return metadatosDe(locale, "/registro", "registro");
}

export default function RegistroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
