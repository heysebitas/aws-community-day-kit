import "./helpers/sin-demo";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as confirmar, POST as confirmarPost } from "@/app/api/confirm/[token]/route";
import { POST as confirmarPasaporte } from "@/app/api/confirm-passport-edit/[token]/route";
import { GET as pase } from "@/app/api/passes/[qrCode]/route";
import { GET as comprobarSlug } from "@/app/api/speaker-profiles/check-slug/route";
import { GET as imagenMarca } from "@/app/api/marca/[pieza]/route";
import { GET as imagenSpeaker } from "@/app/api/og/speaker/[slug]/route";

let secuencia = 0;

function ipDePrueba(): string {
  secuencia += 1;
  return `198.51.100.${secuencia}`;
}

async function exigir429(nombre: string, llamada: (ip: string) => Promise<Response>): Promise<void> {
  const ip = ipDePrueba();

  for (let intento = 0; intento < 400; intento++) {
    let respuesta: Response | undefined;
    try {
      respuesta = await llamada(ip);
    } catch {
      continue;
    }

    if (respuesta.status === 429) {
      assert.match(respuesta.headers.get("Retry-After") ?? "", /^\d+$/, `${nombre} debe indicar Retry-After`);
      const cuerpo = await respuesta.json() as { error?: unknown };
      assert.equal(typeof cuerpo.error, "string", `${nombre} debe explicar el límite`);
      return;
    }
  }

  assert.fail(`${nombre} nunca devolvió 429`);
}

function peticion(ip: string, url: string, metodo = "GET"): NextRequest {
  return new NextRequest(url, {
    method: metodo,
    headers: { "x-forwarded-for": ip },
    ...(metodo === "POST" ? { body: "{}" } : {}),
  });
}

describe("límites de las rutas públicas", () => {
  test("la confirmación de asistencia", async () => {
    await exigir429("confirmación", (ip) => confirmar(
      peticion(ip, "https://evento.test/api/confirm/token"),
      { params: Promise.resolve({ token: "token" }) },
    ));
    await exigir429("confirmación", (ip) => confirmarPost(
      peticion(ip, "https://evento.test/api/confirm/token", "POST"),
      { params: Promise.resolve({ token: "token" }) },
    ));
  });

  test("la confirmación de cambios del pasaporte", async () => {
    await exigir429("confirmación del pasaporte", (ip) => confirmarPasaporte(
      peticion(ip, "https://evento.test/api/confirm-passport-edit/token", "POST"),
      { params: Promise.resolve({ token: "token" }) },
    ));
  });

  test("el pase en PDF", async () => {
    await exigir429("pase en PDF", (ip) => pase(
      peticion(ip, "https://evento.test/api/passes/codigo"),
      { params: Promise.resolve({ qrCode: "codigo" }) },
    ));
  });

  test("la comprobación de slug", async () => {
    await exigir429("comprobación de slug", (ip) => comprobarSlug(
      peticion(ip, "https://evento.test/api/speaker-profiles/check-slug?slug=ada"),
    ));
  });

  test("las imágenes de marca", async () => {
    await exigir429("imágenes de marca", (ip) => imagenMarca(
      peticion(ip, "https://evento.test/api/marca/no-existe"),
      { params: Promise.resolve({ pieza: "no-existe" }) },
    ));
  });

  test("la imagen de un speaker", async () => {
    await exigir429("imagen de speaker", (ip) => imagenSpeaker(
      peticion(ip, "https://evento.test/api/og/speaker/ada"),
      { params: Promise.resolve({ slug: "ada" }) },
    ));
  });
});
