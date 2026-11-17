import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { DOCUMENTOS, ROLES, ENTIDADES } from "@/config";
import { AVAILABILITY, INTEREST_AREAS, SHIRT_SIZES } from "@/data/volunteer-form";
import { Form } from "@/models/form";
import { Registration } from "@/models/registration";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { POST as postRegistro } from "@/app/api/registrations/route";
import { POST as postVoluntario } from "@/app/api/volunteers/route";
import { buscarDuplicados } from "../scripts/doctor";

// Dos envíos a la vez con el mismo correo: contra una base real, porque un doble no reproduce la carrera.
let servidor: MongoMemoryServer;
let ip = 0;

const post = (body: unknown) =>
  new NextRequest("http://prueba.test/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${++ip}` },
    body: JSON.stringify(body),
  });

const doc = DOCUMENTOS[0];
const base = {
  firstName: "Ana", lastName: "Prueba", email: "ana@ejemplo.test",
  documentType: doc!.value, documentNumber: "12345678",
  role: ROLES[0]!.value, entityType: ENTIDADES.find((e) => e.value === "none")?.value ?? ENTIDADES[0]!.value,
  entityName: "Entidad de prueba", acceptCoc: true, acceptPrivacy: true,
};

async function doble(llamar: () => Promise<Response>) {
  const rs = await Promise.all([llamar(), llamar()]);
  return Promise.all(rs.map(async (r) => ({ status: r.status, body: await r.json() as Record<string, unknown> })));
}

before(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri("duplicados");
  await connectDB();
  await Promise.all([Registration.init(), VolunteerSubmission.init(), Form.init()]);
  await Form.create([
    { formType: "attendee", isOpen: true },
    { formType: "volunteer", isOpen: true },
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await servidor.stop();
  delete process.env.MONGODB_URI;
});

describe("un correo, una inscripción", () => {
  test("hay índice único de email en las dos colecciones", async () => {
    for (const m of [Registration, VolunteerSubmission]) {
      const ix = (await m.collection.indexes()).find((i) => i.key.email === 1);
      assert.ok(ix?.unique, `falta el índice único en ${m.collection.name}`);
    }
  });

  test("registro: uno 201 y otro 409 con el mensaje de siempre", async () => {
    const r = await doble(() => postRegistro(post({ data: { ...base, attendance: "in-person" } })));
    assert.deepEqual(r.map((x) => x.status).sort(), [201, 409]);
    assert.equal(r.find((x) => x.status === 409)!.body.error, "Este correo ya está registrado en el evento");
    assert.equal(await Registration.countDocuments({ email: base.email }), 1);
  });

  test("voluntarios: uno 201 y otro 409 con el mensaje de siempre", async () => {
    const data = {
      ...base, email: "vol@ejemplo.test",
      availability: AVAILABILITY[0]!.value, interestAreas: [INTEREST_AREAS[0]!.value],
      shirtSize: SHIRT_SIZES[0]!.value, emergencyName: "Contacto", emergencyPhone: "3000000",
    };
    const r = await doble(() => postVoluntario(post({ data })));
    assert.deepEqual(r.map((x) => x.status).sort(), [201, 409]);
    assert.equal(r.find((x) => x.status === 409)!.body.error, "Ya enviaste una solicitud como voluntario");
    assert.equal(await VolunteerSubmission.countDocuments({ email: data.email }), 1);
  });

  test("doctor detecta un duplicado sembrado, sin escribir", async () => {
    assert.deepEqual(await buscarDuplicados(process.env.MONGODB_URI!), []);
    // Base aparte, sin índice único: así se puede sembrar el duplicado.
    const otra = await MongoMemoryServer.create();
    try {
      const c = await mongoose.createConnection(otra.getUri("viejo")).asPromise();
      await c.collection("registrations").insertMany([{ email: "dup@ejemplo.test" }, { email: "dup@ejemplo.test" }]);
      await c.close();
      const d = await buscarDuplicados(otra.getUri("viejo"));
      assert.deepEqual(d, [{ coleccion: "registrations", email: "dup@ejemplo.test", veces: 2 }]);
    } finally {
      await otra.stop();
    }
  });
});
