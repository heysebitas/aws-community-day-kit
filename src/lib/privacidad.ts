/** El documento de identidad lo ve solo quien organiza: cualquier otro rol recibe el listado sin él. */
export function sinDocumento<T extends { documentNumber?: unknown }>(s: T, rol: string): T {
  if (rol === "admin" || rol === "organizer") return s;
  return { ...s, documentNumber: undefined };
}
