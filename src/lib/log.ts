import "server-only";
import { logError } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Log } from "@/models/log";
import { getAuthUser } from "@/lib/auth";

type LogRole = "admin" | "organizer" | "volunteer" | "attendee" | "badges";

interface CreateLogParams {
  userId?: string;
  userName?: string;
  userRole?: LogRole;
  action: string;
  target: string;
  targetId?: string | null;
  details?: string | null;
}

/**
 * Anota una acción en el registro de actividad.
 *
 * Si no se indica quién la hizo se toma la sesión del panel. Las acciones
 * públicas —alguien que confirma su asistencia— tienen que pasar el actor.
 * Nunca lanza: un fallo al anotar no puede tumbar la acción que se anotaba.
 */
export async function createLog(params: CreateLogParams): Promise<void> {
  try {
    await connectDB();

    let { userId, userName, userRole } = params;
    if (!userId || !userName || !userRole) {
      const user = await getAuthUser().catch(() => null);
      if (user) {
        userId = userId || String(user._id);
        userName = userName || user.name;
        userRole = userRole || (user.role as LogRole);
      }
    }
    if (!userId || !userName || !userRole) return;

    await Log.create({ ...params, userId, userName, userRole });
  } catch (e) {
    // Nunca lanza (ver arriba), pero sin esto un registro perdido no deja rastro.
    logError("log de actividad", e);
  }
}
