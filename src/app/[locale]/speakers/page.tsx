import { textosPostulacion } from "./_textos";
import { SpeakersScreen } from "./_screen";

/** Bases del Call for Speakers, con el formulario debajo. */
export default async function SpeakersPage() {
  return <SpeakersScreen textos={await textosPostulacion()} />;
}
