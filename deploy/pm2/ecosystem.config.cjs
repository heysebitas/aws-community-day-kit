/**
 * Ejemplo para pm2. Cambia `name`, `cwd`, el puerto y la carpeta de logs.
 *
 *   pm2 start deploy/pm2/ecosystem.config.cjs && pm2 save
 *
 * Corre con un usuario sin privilegios: `cwd` y la carpeta de logs tienen que
 * ser suyas.
 */
module.exports = {
  apps: [
    {
      name: "mi-evento",
      cwd: "/srv/mi-evento",

      // El binario de Next y no `npm start`: con npm en medio, pm2 vigila a
      // npm y un reinicio puede dejar a node huérfano ocupando el puerto.
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",

      // Una sola instancia: el límite de peticiones vive en la memoria del proceso.
      exec_mode: "fork",
      instances: 1,

      // Heap con tope y pocas arenas de malloc: sin esto la memoria nativa
      // crece hasta ~800 MB en el pico y no se devuelve. Con esto el pico medido
      // es ~510 MB: el reinicio queda por encima, con margen (docs/rendimiento.md).
      node_args: "--max-old-space-size=256",
      env: { NODE_ENV: "production", PORT: 3000, MALLOC_ARENA_MAX: "2" },

      max_memory_restart: "700M",
      min_uptime: "20s",
      max_restarts: 10,
      restart_delay: 4000,

      time: true,
      merge_logs: true,
      out_file: "/var/log/mi-evento/out.log",
      error_file: "/var/log/mi-evento/error.log",
    },
  ],
};
