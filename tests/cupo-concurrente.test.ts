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

// El cupo se prueba contra una base real: un doble no reproduce la carrera.
let servidor: MongoMemoryServer;
let ip = 0;

const post = (body: unknown) =>
  new NextRequest("http://prueba.test/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${++ip}` },
    body: JSON.stringify(body),
  });

const base = {
  firstName: "Ana", lastName: "Prueba",
  documentType: DOCUMENTOS[0]!.value, documentNumber: "12345678",
  role: ROLES[0]!.value, entityType: ENTIDADES.find((e) => e.value === "none")?.value ?? ENTIDADES[0]!.value,
  entityName: "Entidad de prueba", acceptCoc: true, acceptPrivacy: true,
};
const voluntario = (email: string) => ({
  ...base, email,
  availability: AVAILABILITY[0]!.value, interestAreas: [INTEREST_AREAS[0]!.value],
  shirtSize: SHIRT_SIZES[0]!.value, emergencyName: "Contacto", emergencyPhone: "3000000",
});

before(async () => {
  servidor = await MongoMemoryServer.create();
  process.env.MONGODB_URI = servidor.getUri("cupo");
  await connectDB();
  await Promise.all([Registration.init(), VolunteerSubmission.init(), Form.init()]);
  await Form.create([
    { formType: "attendee", isOpen: true, maxSubmissions: 1 },
    { formType: "volunteer", isOpen: true, maxSubmissions: 1 },
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await servidor.stop();
  delete process.env.MONGODB_URI;
});

describe("cupo atómico", () => {
  test("registros: 4 altas a la vez con cupo 1 → exactamente 1 éxito", async () => {
    const rs = await Promise.all(
      [1, 2, 3, 4].map((i) =>
        postRegistro(post({ data: { ...base, email: `a${i}@ejemplo.test`, attendance: "in-person" } })),
      ),
    );
    const estados = rs.map((r) => r.status);
    assert.equal(estados.filter((s) => s === 201).length, 1, `estados: ${estados}`);
    assert.equal(await Registration.countDocuments({}), 1);
  });

  test("voluntarios: 4 altas a la vez con cupo 1 → exactamente 1 éxito", async () => {
    const rs = await Promise.all(
      [1, 2, 3, 4].map((i) => postVoluntario(post({ data: voluntario(`v${i}@ejemplo.test`) }))),
    );
    const estados = rs.map((r) => r.status);
    assert.equal(estados.filter((s) => s === 201).length, 1, `estados: ${estados}`);
    assert.equal(await VolunteerSubmission.countDocuments({}), 1);
  });

  test("si la creación falla, el cupo se devuelve", async () => {
    await Registration.deleteMany({});
    await Form.updateOne({ formType: "attendee" }, { maxSubmissions: 2 });
    const { sincronizarCupo } = await import("@/lib/cupo");
    await sincronizarCupo("attendee");
    // Un duplicado exacto devuelve 409 antes de reservar; uno que falla al crear devuelve el cupo.
    const ok = await postRegistro(post({ data: { ...base, email: "x@ejemplo.test", attendance: "in-person" } }));
    assert.equal(ok.status, 201);
    const rep = await postRegistro(post({ data: { ...base, email: "x@ejemplo.test", attendance: "in-person" } }));
    assert.equal(rep.status, 409);
    const otro = await postRegistro(post({ data: { ...base, email: "y@ejemplo.test", attendance: "in-person" } }));
    assert.equal(otro.status, 201, "el 409 no debe haber consumido cupo");
  });
});
