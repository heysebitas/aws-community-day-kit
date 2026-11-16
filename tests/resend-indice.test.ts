import { after, before, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { POST } from "@/app/api/webhooks/resend/route";
import { connectDB } from "@/lib/db";
import { Registration } from "@/models/registration";

const SECRETO = "MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";

describe("índice del webhook de Resend", () => {
  let servidor: MongoMemoryServer;

  before(async () => {
    servidor = await MongoMemoryServer.create();
    process.env.MONGODB_URI = servidor.getUri("community-day");
    process.env.RESEND_WEBHOOK_SECRET = SECRETO;
    await connectDB();
    await Registration.init();
  });

  after(async () => {
    await mongoose.disconnect();
    await servidor.stop();
    delete process.env.MONGODB_URI;
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  test("crea un índice parcial sobre resendId", async () => {
    const indices = await Registration.collection.indexes();
    const indice = indices.find((item) => item.key.resendId === 1);

    assert.ok(indice, "falta el índice de resendId");
    assert.deepEqual(indice.partialFilterExpression, {
      resendId: { $type: "string" },
    });
  });

  test("la consulta del webhook usa IXSCAN", async () => {
    await Registration.create({
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.test",
      attendance: "in-person",
      role: "student",
      entityType: "individual",
      qrCode: "qr-indice-resend",
      resendId: "resend-indice",
    });

    // El hint comprueba que el índice parcial cubre la consulta del webhook.
    const explicacion = await Registration.find({ resendId: "resend-indice" })
      .hint("resendId_1")
      .explain("queryPlanner") as unknown as {
        queryPlanner: { winningPlan: unknown };
      };
    const plan = JSON.stringify(explicacion.queryPlanner.winningPlan);

    assert.match(plan, /IXSCAN/);
    assert.doesNotMatch(plan, /COLLSCAN/);
  });

  test("el webhook actualiza un solo registro", async () => {
    const updateOne = mock.method(Registration, "updateOne");
    const updateMany = mock.method(Registration, "updateMany");
    const payload = JSON.stringify({
      type: "email.delivered",
      data: { email_id: "resend-webhook" },
    });
    const timestamp = new Date();
    const id = "msg_test";
    const signature = new Webhook(SECRETO).sign(id, timestamp, payload);
    const request = new NextRequest("http://localhost/api/webhooks/resend", {
      method: "POST",
      headers: {
        "svix-id": id,
        "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
        "svix-signature": signature,
      },
      body: payload,
    });

    try {
      const response = await POST(request);

      assert.equal(response.status, 200);
      assert.equal(updateOne.mock.calls.length, 1);
      assert.equal(updateMany.mock.calls.length, 0);
    } finally {
      mock.restoreAll();
    }
  });
});
