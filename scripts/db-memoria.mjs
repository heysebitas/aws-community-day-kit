/**
 * Levanta un MongoDB en memoria para desarrollo.
 *
 *   npm run db:memoria            → queda escuchando en el puerto 27027
 *   npm run db:memoria -- --check → arranca, comprueba la versión y sale
 *
 * Los datos se pierden al cerrar el proceso. Sirve para probar el kit sin
 * instalar Mongo ni crear una cuenta en la nube; para un evento real usa una
 * de las bases de `docs/base-de-datos.md`.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

const PUERTO = Number(process.env.DB_MEMORIA_PUERTO || 27027);
const soloComprobar = process.argv.includes("--check");

const servidor = await MongoMemoryServer.create({
  instance: { port: soloComprobar ? undefined : PUERTO, dbName: "community-day" },
});

const uri = servidor.getUri("community-day");

if (soloComprobar) {
  const { default: mongoose } = await import("mongoose");
  await mongoose.connect(uri);
  const { version } = await mongoose.connection.db.admin().serverInfo();
  await mongoose.disconnect();
  await servidor.stop();
  console.log(`MongoDB ${version} en memoria: funciona.`);
  process.exit(0);
}

console.log(`MongoDB en memoria listo.\n\n  MONGODB_URI=${uri}\n\nCtrl+C para apagarlo (los datos se borran).`);

const apagar = async () => {
  await servidor.stop();
  process.exit(0);
};
process.on("SIGINT", apagar);
process.on("SIGTERM", apagar);
