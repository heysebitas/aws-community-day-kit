import { Room } from "@/models/room";

/** Busca el nombre de un salón por su id. Se puede sustituir en las pruebas. */
export type BuscarSalon = (id: string) => Promise<string | null>;

const buscarEnLaBase: BuscarSalon = async (id) => {
  const salon = await Room.findById(id).select("name").lean();
  return (salon?.name as string | undefined) ?? null;
};

/**
 * Resuelve la sala de un bloque de agenda.
 *
 * `AgendaEvent` guarda la sala dos veces: `roomId`, que apunta al salón, y
 * `room`, su nombre en texto. Para que no se contradigan, todo lo que guarda un
 * bloque pasa por acá: el id manda, y el texto se toma del salón.
 */
export async function resolverSala(
  roomId: unknown,
  roomTexto: unknown,
  buscarSalon: BuscarSalon = buscarEnLaBase,
): Promise<{ room: string; roomId: string | null }> {
  const id = typeof roomId === "string" && roomId.trim() ? roomId.trim() : null;
  const texto = typeof roomTexto === "string" ? roomTexto.trim() : "";

  if (!id) return { room: texto, roomId: null };

  const nombre = await buscarSalon(id);
  // Si el id apunta a un salón borrado se conserva el texto y se suelta el id.
  if (!nombre) return { room: texto, roomId: null };

  return { room: nombre, roomId: id };
}
