import { leerPasaporte } from "@/lib/lectores";
import { PasaporteVista } from "./_vista";

export const dynamic = "force-dynamic";

export default async function PasaportePage({ params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params;
  let leido;
  try {
    leido = await leerPasaporte(shortId);
  } catch {
    // Si la base falla, la vista pide por la API como antes.
    return <PasaporteVista shortId={shortId} />;
  }
  if (!leido) return <PasaporteVista shortId={shortId} inicial={{ notFound: true }} />;
  // Fechas y Map pasan a datos planos, igual que los dejaría la API.
  const { passport, sponsors } = JSON.parse(JSON.stringify(leido.datos));
  return <PasaporteVista shortId={shortId} inicial={{ passport, sponsors }} />;
}
