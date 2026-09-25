// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { allowMethods, sendJson, sendPayload } from "../src/index.ts";
import { listen } from "./helpers/server.ts";

describe("allowMethods", () => {
  it("should let GET and HEAD through by default", async() => {
    await using server = await listen((req, res) => {
      if (allowMethods(req, res)) {
        res.end("ok");
      }
    });

    assert.strictEqual((await server.request("/")).text, "ok");
    assert.strictEqual((await server.request("/", { method: "HEAD" })).status, 200);
  });

  it("should answer 405 with Allow otherwise", async() => {
    await using server = await listen((req, res) => {
      if (allowMethods(req, res, ["GET", "POST"])) {
        res.end("ok");
      }
    });
    const res = await server.request("/", { method: "DELETE" });

    assert.strictEqual(res.status, 405);
    assert.strictEqual(res.headers.allow, "GET, POST");
    assert.strictEqual(res.body.length, 0);
  });
});

describe("sendPayload", () => {
  it("should send a string with its byte length", async() => {
    await using server = await listen((req, res) => sendPayload(req, res, { body: "héllo" }));
    const res = await server.request("/");

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.text, "héllo");
    assert.strictEqual(res.headers["content-length"], "6");
    assert.strictEqual(res.headers["content-type"], "application/octet-stream");
    assert.strictEqual(res.headers.etag, undefined);
  });

  it("should send a Uint8Array view", async() => {
    const bytes = new TextEncoder().encode("__abc__").subarray(2, 5);
    await using server = await listen((req, res) => sendPayload(req, res, {
      body: bytes,
      contentType: "text/plain",
      cacheControl: "no-store"
    }));
    const res = await server.request("/");

    assert.strictEqual(res.text, "abc");
    assert.strictEqual(res.headers["content-type"], "text/plain");
    assert.strictEqual(res.headers["cache-control"], "no-store");
  });

  it("should answer HEAD with headers only", async() => {
    await using server = await listen((req, res) => sendPayload(req, res, { body: "hello" }));
    const res = await server.request("/", { method: "HEAD" });

    assert.strictEqual(res.headers["content-length"], "5");
    assert.strictEqual(res.body.length, 0);
  });

  it("should answer 304 on a matching ETag", async() => {
    await using server = await listen((req, res) => sendPayload(req, res, { body: "hello", etag: true }));
    const first = await server.request("/");
    const second = await server.request("/", { headers: { "if-none-match": first.headers.etag } });

    assert.match(first.headers.etag ?? "", /^"[\w-]+"$/);
    assert.strictEqual(second.status, 304);
    assert.strictEqual(second.headers.etag, first.headers.etag);
    assert.strictEqual(second.headers["content-type"], undefined);
    assert.strictEqual(second.body.length, 0);
  });

  it("should serve a byte range of the payload", async() => {
    await using server = await listen((req, res) => sendPayload(req, res, { body: "hello world" }));
    const res = await server.request("/", { headers: { range: "bytes=6-" } });

    assert.strictEqual(res.status, 206);
    assert.strictEqual(res.text, "world");
    assert.strictEqual(res.headers["content-range"], "bytes 6-10/11");
  });
});

describe("sendJson", () => {
  it("should serialize the value as JSON", async() => {
    await using server = await listen((req, res) => sendJson(req, res, { body: { ok: true }, etag: true }));
    const res = await server.request("/");

    assert.deepStrictEqual(JSON.parse(res.text), { ok: true });
    assert.strictEqual(res.headers["content-type"], "application/json; charset=utf-8");
    assert.ok(res.headers.etag);
  });

  it("should let options override the content type", async() => {
    await using server = await listen((req, res) => {
      sendJson(req, res, { body: [], contentType: "application/ld+json" });
    });

    assert.strictEqual((await server.request("/")).headers["content-type"], "application/ld+json");
  });
});
