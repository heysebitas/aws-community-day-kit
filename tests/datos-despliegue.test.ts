import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { montarEntorno, desmontarEntorno, peticion, conParams, leer } from "./helpers/entorno";

/** Duplicado exacto, 409 al corregir el correo, contraseña mínima y cupo devuelto, con Mongo en memoria. */

const log = console.log;
before(async () => {
  console.log = () => {};
  await montarEntorno("datos-despliegue");
});
after(async () => {
  console.log = log;
  await desmontarEntorno();
});

const reg = (email: string, qrCode: string) => ({
  firstName: "Ana", lastName: "Prueba", email, qrCode, attendance: "in-person",
  role: "student", entityType: "none", entityName: "Entidad", emailStatus: "skipped",
});

describe("duplicados por igualdad exacta", () => {
  test("con mayúsculas y espacios se encuentra; un comodín no coincide con nada", async () => {
    const { Registration } = await import("@/models/registration");
    const { checkAlreadyAttendee } = await import("@/lib/duplicate-check");
    await Registration.collection.insertOne(reg("dup@ejemplo.test", "QR-D1"));
    assert.equal((await checkAlreadyAttendee("  DUP@Ejemplo.test ")).blocked, true);
    assert.equal((await checkAlreadyAttendee(".*@ejemplo.test")).blocked, false);
    assert.equal((await checkAlreadyAttendee("du@ejemplo.test")).blocked, false);
  });

  test("la consulta es una igualdad sobre el correo normalizado (sin $regex)", async () => {
    const { Registration } = await import("@/models/registration");
    const { checkAlreadyVolunteer } = await import("@/lib/duplicate-check");
    const { VolunteerSubmission } = await import("@/models/volunteer-submission");
    let filtro: unknown;
    const original = VolunteerSubmission.exists;
    VolunteerSubmission.exists = ((f: unknown) => { filtro = f; return original.call(VolunteerSubmission, f as never); }) as never;
    try {
      await checkAlreadyVolunteer(" X@Ejemplo.test");
    } finally {
      VolunteerSubmission.exists = original;
    }
    assert.deepEqual(filtro, { email: "x@ejemplo.test" });
    void Registration;
  });
});

describe("reenvío con corrección de correo", () => {
  test("un correo de otra persona responde 409 y no cambia nada", async () => {
    const { Registration } = await import("@/models/registration");
    const { POST } = await import("@/app/api/registrations/[id]/resend/route");
    await Registration.collection.insertOne(reg("a@ejemplo.test", "QR-A"));
    const { insertedId } = await Registration.collection.insertOne(reg("b@ejemplo.test", "QR-B"));
    await Registration.syncIndexes();
    const r = await leer(await POST(peticion("/x", { email: " A@Ejemplo.test " }) as never, conParams({ id: String(insertedId) })));
    assert.equal(r.status, 409);
    assert.match(String(r.body.error), /ya está registrado/);
    assert.equal((await Registration.findById(insertedId))!.email, "b@ejemplo.test");
  });

  test("un correo mal escrito responde 400", async () => {
    const { Registration } = await import("@/models/registration");
    const { POST } = await import("@/app/api/registrations/[id]/resend/route");
    const doc = await Registration.findOne({ qrCode: "QR-B" });
    const r = await leer(await POST(peticion("/x", { email: "sin-arroba" }) as never, conParams({ id: String(doc!._id) })));
    assert.equal(r.status, 400);
  });
});

describe("contraseña mínima de 10", () => {
  test("crear usuario con clave de 9 caracteres se rechaza; con 10 pasa", async () => {
    const { POST } = await import("@/app/api/users/route");
    const cuerpo = (password: string, email: string) => ({ name: "Nueva", email, role: "volunteer", password });
    const corta = await leer(await POST(peticion("/api/users", cuerpo("123456789", "n1@ejemplo.test")) as never));
    assert.equal(corta.status, 400);
    assert.match(String(corta.body.error), /10 caracteres/);
    const ok = await leer(await POST(peticion("/api/users", cuerpo("1234567890", "n2@ejemplo.test")) as never));
    assert.equal(ok.status, 200);
  });
});

describe("el cupo se devuelve si la creación falla", () => {
  test("un fallo al crear no deja el cupo gastado", async () => {
    const { Form } = await import("@/models/form");
    const { Registration } = await import("@/models/registration");
    const { Contador } = await import("@/models/contador");
    const { reservarCupo, devolverCupo, sincronizarCupo } = await import("@/lib/cupo");
    await Registration.deleteMany({});
    await Form.create({ formType: "attendee", isOpen: true, maxSubmissions: 1 });
    await sincronizarCupo("attendee");
    assert.equal(await reservarCupo("attendee", 1), true);
    assert.equal(await reservarCupo("attendee", 1), false);
    await devolverCupo("attendee", 1);
    assert.equal((await Contador.findById("attendee"))!.n, 0);
    assert.equal(await reservarCupo("attendee", 1), true);
  });
});
