// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";
import { Readable } from "node:stream";

// Import Internal Dependencies
import { send, type SendOptions, type ServoEntry } from "../src/index.ts";
import { listen } from "./helpers/server.ts";

// CONSTANTS
const kMtime = new Date("2026-01-01T10:00:00.000Z");
const kBody = "0123456789";

function entry(
  overrides: Partial<ServoEntry> = {}
): ServoEntry {
  return {
    size: kBody.length,
    mtime: kMtime,
    body(range) {
      return Readable.from([range === undefined ? kBody : kBody.slice(range.start, range.end + 1)]);
    },
    async [Symbol.asyncDispose]() {},
    ...overrides
  };
}

function serve(
  target: () => ServoEntry,
  options: Partial<Omit<SendOptions, "entry">> = {}
) {
  return listen((req, res) => {
    send(req, res, { entry: target(), path: "digits.txt", ...options }).catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
}

describe("send", () => {
  it("should send 200 with the default headers", async() => {
    await using server = await serve(() => entry());
    const res = await server.request("/");

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.text, kBody);
    assert.strictEqual(res.headers["content-type"], "text/plain; charset=utf-8");
    assert.strictEqual(res.headers["content-length"], "10");
    assert.strictEqual(res.headers["last-modified"], kMtime.toUTCString());
    assert.strictEqual(res.headers.etag, `W/"a-${kMtime.getTime().toString(16)}"`);
    assert.strictEqual(res.headers["accept-ranges"], "bytes");
    assert.strictEqual(res.headers["x-content-type-options"], "nosniff");
    assert.strictEqual(res.headers["cache-control"], undefined);
    assert.strictEqual(res.headers.vary, undefined);
  });

  it("should prefer the entry etag", async() => {
    await using server = await serve(() => entry({ etag: "\"abc\"" }));

    assert.strictEqual((await server.request("/")).headers.etag, "\"abc\"");
  });

  it("should omit ETag and Last-Modified without mtime or when disabled", async() => {
    await using bare = await serve(() => entry({ mtime: undefined }));
    const res = await bare.request("/");
    assert.strictEqual(res.headers.etag, undefined);
    assert.strictEqual(res.headers["last-modified"], undefined);

    await using disabled = await serve(() => entry(), { etag: false, lastModified: false });
    const other = await disabled.request("/");
    assert.strictEqual(other.headers.etag, undefined);
    assert.strictEqual(other.headers["last-modified"], undefined);
  });

  it("should send Cache-Control, Content-Encoding and Vary from options", async() => {
    await using server = await serve(() => entry(), {
      maxAge: 60,
      immutable: true,
      encoding: "br",
      vary: true,
      contentType: "application/x-custom"
    });
    const res = await server.request("/");

    assert.strictEqual(res.headers["cache-control"], "public, max-age=60, immutable");
    assert.strictEqual(res.headers["content-encoding"], "br");
    assert.strictEqual(res.headers.vary, "Accept-Encoding");
    assert.strictEqual(res.headers["content-type"], "application/x-custom");
  });

  it("should keep headers set before send, except framing headers", async() => {
    await using server = await listen((req, res) => {
      res.setHeader("Content-Type", "text/x-mine");
      res.setHeader("Cache-Control", "private");
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Origin");
      void send(req, res, { entry: entry(), path: "digits.txt", maxAge: 10, vary: true });
    });
    const res = await server.request("/");

    assert.strictEqual(res.headers["content-type"], "text/x-mine");
    assert.strictEqual(res.headers["cache-control"], "private");
    assert.strictEqual(res.headers["content-encoding"], undefined);
    assert.strictEqual(res.headers.vary, "Origin, Accept-Encoding");
  });

  it("should not duplicate an existing Vary field", async() => {
    await using server = await listen((req, res) => {
      res.setHeader("Vary", "accept-encoding");
      void send(req, res, { entry: entry(), path: "digits.txt", vary: true });
    });

    assert.strictEqual((await server.request("/")).headers.vary, "accept-encoding");
  });

  it("should let setHeaders override anything, validators included", async() => {
    await using server = await serve(() => entry(), {
      setHeaders(res, path, served) {
        res.setHeader("ETag", "\"custom\"");
        res.setHeader("X-Path", `${path}:${served.size}`);
      }
    });

    const res = await server.request("/");
    assert.strictEqual(res.headers.etag, "\"custom\"");
    assert.strictEqual(res.headers["x-path"], "digits.txt:10");

    const cached = await server.request("/", { headers: { "if-none-match": "\"custom\"" } });
    assert.strictEqual(cached.status, 304);
  });

  it("should answer HEAD without a body and close the entry", async() => {
    let closed = 0;
    await using server = await serve(() => entry({
      [Symbol.asyncDispose]: async() => void closed++
    }));
    const res = await server.request("/", { method: "HEAD" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers["content-length"], "10");
    assert.strictEqual(res.body.length, 0);
    assert.strictEqual(closed, 1);
  });

  describe("conditional requests", () => {
    it("should answer 304 on a matching If-None-Match", async() => {
      let closed = 0;
      await using server = await serve(() => entry({
        [Symbol.asyncDispose]: async() => void closed++
      }), { maxAge: 60, vary: true });
      const first = await server.request("/");
      const res = await server.request("/", { headers: { "if-none-match": first.headers.etag } });

      assert.strictEqual(res.status, 304);
      assert.strictEqual(res.body.length, 0);
      assert.strictEqual(res.headers.etag, first.headers.etag);
      assert.strictEqual(res.headers["last-modified"], kMtime.toUTCString());
      assert.strictEqual(res.headers["cache-control"], "public, max-age=60");
      assert.strictEqual(res.headers.vary, "Accept-Encoding");
      assert.strictEqual(res.headers["content-type"], undefined);
      assert.strictEqual(res.headers["content-length"], undefined);
      // Once for each response.
      assert.strictEqual(closed, 2);
    });

    it("should answer 304 on If-Modified-Since", async() => {
      await using server = await serve(() => entry());
      const res = await server.request("/", { headers: { "if-modified-since": kMtime.toUTCString() } });

      assert.strictEqual(res.status, 304);
    });

    it("should answer 200 when the validators differ", async() => {
      await using server = await serve(() => entry());
      const res = await server.request("/", { headers: { "if-none-match": "\"other\"" } });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.text, kBody);
    });
  });

  describe("ranges", () => {
    it("should send exactly one byte for bytes=0-0", async() => {
      await using server = await serve(() => entry());
      const res = await server.request("/", { headers: { range: "bytes=0-0" } });

      assert.strictEqual(res.status, 206);
      assert.strictEqual(res.text, "0");
      assert.strictEqual(res.headers["content-length"], "1");
      assert.strictEqual(res.headers["content-range"], "bytes 0-0/10");
    });

    it("should send the last bytes of a suffix range", async() => {
      await using server = await serve(() => entry());
      const res = await server.request("/", { headers: { range: "bytes=-3" } });

      assert.strictEqual(res.status, 206);
      assert.strictEqual(res.text, "789");
      assert.strictEqual(res.headers["content-range"], "bytes 7-9/10");
    });

    it("should answer 416 when start > end or beyond the size", async() => {
      let closed = 0;
      await using server = await serve(() => entry({
        [Symbol.asyncDispose]: async() => void closed++
      }));
      for (const range of ["bytes=5-2", "bytes=999999-"]) {
        const res = await server.request("/", { headers: { range } });

        assert.strictEqual(res.status, 416, range);
        assert.strictEqual(res.headers["content-range"], "bytes */10");
        assert.strictEqual(res.headers["content-length"], "0");
        assert.strictEqual(res.body.length, 0);
      }
      assert.strictEqual(closed, 2);
    });

    it("should ignore multiple ranges and send 200", async() => {
      await using server = await serve(() => entry());
      const res = await server.request("/", { headers: { range: "bytes=0-1,4-5" } });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.text, kBody);
      assert.strictEqual(res.headers["content-range"], undefined);
    });

    it("should ignore ranges on HEAD", async() => {
      await using server = await serve(() => entry());
      const res = await server.request("/", { method: "HEAD", headers: { range: "bytes=0-0" } });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers["content-length"], "10");
    });

    it("should honor If-Range with a strong etag", async() => {
      await using server = await serve(() => entry({ etag: "\"v1\"" }));

      const match = await server.request("/", { headers: { range: "bytes=0-1", "if-range": "\"v1\"" } });
      assert.strictEqual(match.status, 206);
      assert.strictEqual(match.text, "01");

      const stale = await server.request("/", { headers: { range: "bytes=0-1", "if-range": "\"v0\"" } });
      assert.strictEqual(stale.status, 200);
      assert.strictEqual(stale.text, kBody);
    });

    it("should send the full body when If-Range carries a weak etag", async() => {
      await using server = await serve(() => entry());
      const { headers } = await server.request("/");
      const res = await server.request("/", { headers: { range: "bytes=0-1", "if-range": headers.etag } });

      assert.strictEqual(res.status, 200);
    });

    it("should honor If-Range with the Last-Modified date", async() => {
      await using server = await serve(() => entry());
      const res = await server.request("/", {
        headers: { range: "bytes=0-1", "if-range": kMtime.toUTCString() }
      });

      assert.strictEqual(res.status, 206);
    });
  });

  it("should send a Uint8Array body", async() => {
    const bytes = new TextEncoder().encode("xxhelloxx").subarray(2, 7);
    await using server = await serve(() => entry({ size: 5, body: () => bytes }));
    const res = await server.request("/");

    assert.strictEqual(res.text, "hello");
  });

  it("should send an empty body without calling body()", async() => {
    let closed = 0;
    await using server = await serve(() => entry({
      size: 0,
      body: () => assert.fail("body() must not be called"),
      [Symbol.asyncDispose]: async() => void closed++
    }));
    const res = await server.request("/");

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers["content-length"], "0");
    assert.strictEqual(closed, 1);
  });

  it("should merge contentTypes over the defaults", async() => {
    const contentTypes = { ".xyz": "text/x-unknown" };

    await using custom = await serve(() => entry(), { path: "a.xyz", contentTypes });
    assert.strictEqual((await custom.request("/")).headers["content-type"], "text/x-unknown; charset=utf-8");

    await using known = await serve(() => entry(), { path: "a.css", contentTypes });
    assert.strictEqual((await known.request("/")).headers["content-type"], "text/css; charset=utf-8");
  });

  it("should close the entry once after streaming the body", async() => {
    let closed = 0;
    await using server = await serve(() => entry({
      [Symbol.asyncDispose]: async() => void closed++
    }));

    assert.strictEqual((await server.request("/")).text, kBody);
    assert.strictEqual(closed, 1);
  });

  it("should restore the caller's headers when body() fails", async() => {
    await using server = await listen((req, res) => {
      res.setHeader("Cache-Control", "private");
      res.setHeader("X-Trace", "1");
      send(req, res, {
        entry: entry({ body: () => Promise.reject(new Error("EIO")) }),
        path: "digits.txt",
        maxAge: 10,
        vary: true
      }).catch(() => {
        res.statusCode = 500;
        res.end();
      });
    });
    const res = await server.request("/");

    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.headers["cache-control"], "private");
    assert.strictEqual(res.headers["x-trace"], "1");
    const sendHeaders = [
      "content-type",
      "etag",
      "last-modified",
      "accept-ranges",
      "x-content-type-options",
      "vary"
    ];
    for (const name of sendHeaders) {
      assert.strictEqual(res.headers[name], undefined, name);
    }
  });

  it("should reject and close the entry when body() fails", async() => {
    let closed = 0;
    await using server = await serve(() => entry({
      body: () => Promise.reject(new Error("EIO")),
      [Symbol.asyncDispose]: async() => void closed++
    }));
    const res = await server.request("/");

    assert.strictEqual(res.status, 500);
    assert.strictEqual(closed, 1);
  });

  it("should destroy the response when the stream fails after the headers", async() => {
    await using server = await serve(() => entry({
      body: () => new Readable({
        read() {
          this.push("01234");
          this.destroy(new Error("EIO"));
        }
      })
    }));

    await assert.rejects(() => server.request("/"));
  });
});
