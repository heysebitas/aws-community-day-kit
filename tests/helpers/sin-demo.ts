// Se importa antes que cualquier ruta: con MODO_DEMO la conexión va a la base en
// memoria de la demo, que deja el proceso abierto y la prueba no termina nunca.
delete process.env.MODO_DEMO;
