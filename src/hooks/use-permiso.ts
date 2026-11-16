"use client";

import { useAuth } from "@/contexts/auth-context";
import { alcanza, puedeEliminar, type SeccionId } from "@/lib/permisos";

/** Qué puede hacer quien está mirando, en esta sección. */
export function usePermiso(seccion: SeccionId) {
  const { user } = useAuth();

  return {
    puedeVer: alcanza(user, seccion, "ver"),
    puedeEditar: alcanza(user, seccion, "editar"),
    puedeBorrar: puedeEliminar(user, seccion),
    /** Sólo mira: sirve para pintar el aviso de arriba. */
    soloLectura: alcanza(user, seccion, "ver") && !alcanza(user, seccion, "editar"),
  };
}
