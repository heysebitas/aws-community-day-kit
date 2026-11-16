import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { esIpPrivada } from "@/lib/fetch-seguro";
import { comprobarPin, nuevoPin } from "@/lib/pin";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { armarMime, cabecera } from "@/lib/correo-mime";

const peticion = (cabeceras: Record<string, string> = {}) => new Request("https://ejemplo.test/", { headers: cabeceras });

describe("de quién es la petición", () => {
  beforeEach(() => {
    delete process.env.CABECERA_IP;
    delete process.env.PROXIES_DE_CONFIANZA;
  });

  test("se toma la última IP de la cadena, que es la que puso nuestro proxy", () => {
    // Lo de la izquierda lo escribe quien hace la petición.
    assert.equal(getIp(peticion({ "x-forwarded-for": "1.1.1.1, 9.9.9.9, 203.0.113.7" })), "203.0.113.7");
  });

  test("con dos proxies propios, la penúltima", () => {
    process.env.PROXIES_DE_CONFIANZA = "2";
    assert.equal(getIp(peticion({ "x-forwarded-for": "1.1.1.1, 203.0.113.7, 10.0.0.2" })), "203.0.113.7");
  });

  test("una cabecera propia del CDN manda si se configuró", () => {
    process.env.CABECERA_IP = "cf-connecting-ip";
    assert.equal(getIp(peticion({ "cf-connecting-ip": "198.51.100.4", "x-forwarded-for": "1.1.1.1" })), "198.51.100.4");
  });

  test("sin cabeceras no se inventa una", () => {
    assert.equal(getIp(peticion()), "unknown");
  });

  test("falsear la cabecera no esquiva el límite", () => {
    const clave = () => `prueba:${getIp(peticion({ "x-forwarded-for": `${Math.random()}, 203.0.113.99` }))}`;
    for (let i = 0; i < 3; i++) assert.equal(rateLimit(clave(), 3, 60_000).ok, true);
    assert.equal(rateLimit(clave(), 3, 60_000).ok, false);
  });
});

describe("los PIN", () => {
  test("son de cuatro cifras", () => {
    for (let i = 0; i < 200; i++) assert.match(nuevoPin(), /^[1-9]\d{3}$/);
  });

  test("al quinto fallo se bloquea, aunque después llegue el correcto", () => {
    const quien = peticion({ "x-forwarded-for": "203.0.113.50" });
    for (let i = 0; i < 4; i++) {
      const r = comprobarPin(quien, "prueba", "pasaporte-1", "0000", "4321");
      assert.equal(r.ok, false);
    }
    const quinto = comprobarPin(quien, "prueba", "pasaporte-1", "0000", "4321");
    assert.deepEqual([quinto.ok, !quinto.ok && quinto.bloqueado], [false, true]);
    assert.equal(comprobarPin(quien, "prueba", "pasaporte-1", "4321", "4321").ok, false);
  });

  test("el bloqueo de uno no bloquea a otra persona", () => {
    const otra = peticion({ "x-forwarded-for": "203.0.113.51" });
    assert.equal(comprobarPin(otra, "prueba", "pasaporte-1", "4321", "4321").ok, true);
  });

  test("un pasaporte sin PIN no se abre con cualquier cosa", () => {
    const quien = peticion({ "x-forwarded-for": "203.0.113.52" });
    assert.equal(comprobarPin(quien, "prueba", "pasaporte-2", "", "").ok, false);
    assert.equal(comprobarPin(quien, "prueba", "pasaporte-2", undefined, null).ok, false);
  });
});

describe("a dónde no va el servidor a buscar una imagen", () => {
  test("redes privadas, locales y de metadatos", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      assert.equal(esIpPrivada(ip), true, `${ip} debería estar vetada`);
    }
  });

  test("las públicas sí", () => {
    for (const ip of ["8.8.8.8", "172.32.0.1", "52.95.110.1", "2606:4700::1111"]) {
      assert.equal(esIpPrivada(ip), false, `${ip} es pública`);
    }
  });
});

describe("el correo en crudo", () => {
  test("un asunto con tildes va codificado y uno sin ellas no", () => {
    assert.equal(cabecera("Tu pase"), "Tu pase");
    assert.match(cabecera("Confirmación"), /^=\?UTF-8\?B\?.+\?=$/);
  });

  test("un salto de línea en el asunto no abre una cabecera nueva", () => {
    const mime = armarMime({ from: "a@ejemplo.test", to: "b@ejemplo.test", subject: "Hola\r\nBcc: x@ejemplo.test", html: "<p>x</p>" });
    assert.ok(!/^Bcc:/m.test(mime));
  });

  test("lleva el adjunto como parte aparte", () => {
    const mime = armarMime(
      { from: "Evento <a@ejemplo.test>", to: "b@ejemplo.test", subject: "x", html: "<p>x</p>", attachments: [{ filename: "pase.pdf", content: "QUJD" }] },
      "FRONTERA",
    );
    assert.match(mime, /Content-Type: multipart\/mixed; boundary="FRONTERA"/);
    assert.match(mime, /Content-Type: application\/pdf; name="pase.pdf"/);
    assert.ok(mime.trimEnd().endsWith("--FRONTERA--"));
  });
});
