// `server-only` lanza fuera de Next a propósito. Las pruebas y los scripts que
// importan módulos de servidor lo cargan con `tsx --import` y aquí se anula.
import Module from "node:module";

const cargar = Module._load;
Module._load = function (peticion, padre, esPrincipal) {
  if (peticion === "server-only") return {};
  return cargar.call(this, peticion, padre, esPrincipal);
};
