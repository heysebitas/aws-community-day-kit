import { textosPostulacion } from "../_textos";
import { SpeakersScreen } from "../_screen";

/** Solo el formulario, sin las bases arriba. */
export default async function PostularPage() {
  return <SpeakersScreen formOnly textos={await textosPostulacion()} />;
}
