// Import Node.js Dependencies
import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, it } from "node:test";
import zlib from "node:zlib";

// Import Internal Dependencies
import { bytesSource, servo, type ServoOptions, type ServoSource } from "../src/index.ts";
import { listen } from "./helpers/server.ts";
import { createWww, kAppJs, kDigits } from "./helpers/www.ts";

function serve(
  root: string | ServoSource,
  options?: ServoOptions,
  withNext = false
) {
  const handler = servo(root, options);

  return listen((req, res) => {
    handler(req, res, withNext ?
      () => {
        res.statusCode = 299;
        res.end("next");
      } :
      undefined);
  });
}

describe("servo", () => {
  describe("prefix", () => {
    it("should serve from the root by default", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);
      const res = await server.request("/about.html");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.text, "<h1>about</h1>");
    });

    it("should serve files under a prefix, with or without a trailing slash", async() => {
      await using www = await createWww();
      for (const prefix of ["/assets", "/assets/", "assets"]) {
        await using server = await serve(www.root, { prefix });

        assert.strictEqual((await server.request("/assets/about.html")).status, 200, prefix);
      }
    });

    it("should pass requests outside the prefix to next", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { prefix: "/assets" }, true);

      assert.strictEqual((await server.request("/about.html")).status, 299);
      assert.strictEqual((await server.request("/assetsabout.html")).status, 299);
    });

    it("should answer 404 outside the prefix without next", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { prefix: "/assets" });

      assert.strictEqual((await server.request("/about.html")).status, 404);
    });

    it("should redirect the bare prefix to its trailing slash, keeping the query", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { prefix: "/editors/scene" });
      const res = await server.request("/editors/scene?debug=1#x");

      assert.strictEqual(res.status, 302);
      assert.strictEqual(res.headers.location, "/editors/scene/?debug=1");
    });

    it("should serve the index for the bare prefix when redirect is off", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { prefix: "/editors/scene", redirect: false });
      const res = await server.request("/editors/scene");

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.text, "<h1>home</h1>");
    });
  });

  describe("methods", () => {
    it("should pass other methods to next by default", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, {}, true);

      assert.strictEqual((await server.request("/about.html", { method: "POST" })).status, 299);
    });

    it("should answer 405 when rejecting or without next", async() => {
      await using www = await createWww();
      await using rejecting = await serve(www.root, { methodNotAllowed: "reject" }, true);
      const res = await rejecting.request("/about.html", { method: "DELETE" });
      assert.strictEqual(res.status, 405);
      assert.strictEqual(res.headers.allow, "GET, HEAD");

      await using bare = await serve(www.root);
      assert.strictEqual((await bare.request("/about.html", { method: "PUT" })).status, 405);
    });

    it("should answer HEAD without a body", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);
      const res = await server.request("/digits.txt", { method: "HEAD" });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers["content-length"], "1000");
      assert.strictEqual(res.body.length, 0);
    });
  });

  describe("resolution", () => {
    it("should serve the index of the root", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);
      const res = await server.request("/");

      assert.strictEqual(res.text, "<h1>home</h1>");
      assert.strictEqual(res.headers["content-type"], "text/html; charset=utf-8");
    });

    it("should serve the index of a directory", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);

      assert.strictEqual((await server.request("/docs/")).text, "<h1>docs</h1>");
    });

    it("should redirect a directory without trailing slash", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { prefix: "/site" });
      const res = await server.request("/site/docs?page=2");

      assert.strictEqual(res.status, 302);
      assert.strictEqual(res.headers.location, "/site/docs/?page=2");
    });

    it("should encode the redirect location", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);
      const res = await server.request("/a/../docs");

      assert.strictEqual(res.headers.location, "/docs/");
    });

    it("should serve the directory index without redirect when disabled", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { redirect: false });

      assert.strictEqual((await server.request("/docs")).text, "<h1>docs</h1>");
    });

    it("should not serve a directory index when index is false", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { index: false, redirect: false });

      assert.strictEqual((await server.request("/")).status, 404);
      assert.strictEqual((await server.request("/docs/")).status, 404);
      assert.strictEqual((await server.request("/docs")).status, 404);
    });

    it("should try extensions in order", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);

      assert.strictEqual((await server.request("/about")).text, "<h1>about</h1>");
      assert.strictEqual((await server.request("/docs/guide")).text, "<h1>guide</h1>");
    });

    it("should accept extensions with a leading dot, or none at all", async() => {
      await using www = await createWww();
      await using dotted = await serve(www.root, { extensions: [".html"] });
      assert.strictEqual((await dotted.request("/about")).status, 200);

      await using none = await serve(www.root, { extensions: [] });
      assert.strictEqual((await none.request("/about")).status, 404);
    });

    it("should decode the path once", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);

      assert.strictEqual((await server.request("/100%25.txt")).text, "percent");
      assert.strictEqual((await server.request("/with%20space.txt")).text, "space");
      assert.strictEqual((await server.request("/about.html?x=1")).status, 200);
    });

    it("should call onNoMatch, then next, then 404", async() => {
      await using www = await createWww();
      await using hooked = await serve(www.root, {
        onNoMatch(_req, res) {
          res.statusCode = 410;
          res.end();
        }
      }, true);
      assert.strictEqual((await hooked.request("/missing.txt")).status, 410);

      await using chained = await serve(www.root, {}, true);
      assert.strictEqual((await chained.request("/missing.txt")).status, 299);

      await using bare = await serve(www.root);
      assert.strictEqual((await bare.request("/missing.txt")).status, 404);
    });

    it("should throw on unsafe index and extension values", () => {
      assert.throws(() => servo("dist", { index: "../package.json" }), TypeError);
      assert.throws(() => servo("dist", { index: "docs/" }), TypeError);
      assert.throws(() => servo("dist", { extensions: ["/../../package.json"] }), TypeError);
      assert.throws(() => servo("dist", { extensions: ["html/index.html"] }), TypeError);
      assert.throws(() => servo("dist", { extensions: [""] }), TypeError);
    });

    it("should serve a nested index file", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { index: "docs/index.html" });

      assert.strictEqual((await server.request("/")).text, "<h1>docs</h1>");
    });

    it("should try the index, then extensions, of a directory when redirect is off", async() => {
      await using www = await createWww();
      await fs.writeFile(www.resolve("docs.html"), "<h1>docs page</h1>");
      await using indexed = await serve(www.root, { redirect: false });
      assert.strictEqual((await indexed.request("/docs")).text, "<h1>docs</h1>");

      await using extended = await serve(www.root, { redirect: false, index: false });
      assert.strictEqual((await extended.request("/docs")).text, "<h1>docs page</h1>");
      assert.strictEqual((await extended.request("/docs/")).status, 404);
    });
  });

  describe("single page application", () => {
    it("should serve the index for unknown extensionless paths", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { single: true });

      const res = await server.request("/some/client/route");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.text, "<h1>home</h1>");
      assert.strictEqual((await server.request("/nested/")).text, "<h1>home</h1>");
    });

    it("should still answer 404 for missing files with an extension", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { single: true });

      assert.strictEqual((await server.request("/missing.js")).status, 404);
    });

    it("should serve a custom fallback file", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { single: "docs/index.html" });

      assert.strictEqual((await server.request("/route")).text, "<h1>docs</h1>");
    });

    it("should use index.html when index is disabled", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { single: true, index: false });

      assert.strictEqual((await server.request("/route")).text, "<h1>home</h1>");
    });

    it("should throw on an unsafe fallback file", () => {
      assert.throws(() => servo("dist", { single: "../index.html" }), TypeError);
      assert.throws(() => servo("dist", { single: "docs/" }), TypeError);
    });
  });

  describe("dotfiles and ignore", () => {
    it("should hide dotfiles with 404 by default", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, {}, true);

      assert.strictEqual((await server.request("/.env")).status, 404);
      assert.strictEqual((await server.request("/.git/config")).status, 404);
      assert.strictEqual((await server.request("/.well-known/.hidden")).status, 404);
    });

    it("should always serve .well-known", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);
      const res = await server.request("/.well-known/security.txt");

      assert.strictEqual(res.status, 200);
      assert.match(res.text, /^Contact:/);
    });

    it("should answer 403 with dotfiles deny", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { dotfiles: "deny" });

      assert.strictEqual((await server.request("/.env")).status, 403);
    });

    it("should serve dotfiles with dotfiles allow", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { dotfiles: "allow" });

      assert.strictEqual((await server.request("/.env")).text, "SECRET=1");
    });

    it("should hide ignored paths, including fallbacks", async() => {
      await using www = await createWww();
      const seen: string[] = [];
      await using server = await serve(www.root, {
        single: true,
        ignore: (path) => {
          seen.push(path);

          return path === "about.html" || path.startsWith("docs");
        }
      });

      assert.strictEqual((await server.request("/about.html")).status, 404);
      assert.strictEqual((await server.request("/docs/index.html")).status, 404);
      assert.strictEqual((await server.request("/about")).text, "<h1>home</h1>");
      assert.ok(!seen.includes(""));
    });
  });

  describe("headers", () => {
    it("should send no-cache in dev", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { dev: true, maxAge: 100 });

      assert.strictEqual((await server.request("/about.html")).headers["cache-control"], "no-cache");
    });

    it("should send max-age and immutable", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { maxAge: 100, immutable: true });

      const res = await server.request("/about.html");

      assert.strictEqual(res.headers["cache-control"], "public, max-age=100, immutable");
    });

    it("should merge content types over the defaults", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { contentTypes: { ".xyz": "text/x-unknown" } });

      const custom = await server.request("/unknown.xyz");
      const json = await server.request("/data.json");

      assert.strictEqual(custom.headers["content-type"], "text/x-unknown; charset=utf-8");
      assert.strictEqual(json.headers["content-type"], "application/json; charset=utf-8");
    });

    it("should call setHeaders with the served path", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, {
        setHeaders(res, path) {
          res.setHeader("X-Served", path);
        }
      });

      assert.strictEqual((await server.request("/docs/")).headers["x-served"], "docs/index.html");
    });

    it("should revalidate with the file ETag", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);
      const first = await server.request("/digits.txt");
      const second = await server.request("/digits.txt", {
        headers: { "if-none-match": first.headers.etag }
      });

      assert.match(first.headers.etag ?? "", /^W\/"3e8-[0-9a-f]+"$/);
      assert.strictEqual(second.status, 304);
    });

    it("should serve ranges of a file", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);
      const res = await server.request("/digits.txt", { headers: { range: "bytes=-500" } });

      assert.strictEqual(res.status, 206);
      assert.strictEqual(res.text, kDigits.slice(500));
      assert.strictEqual(res.headers["content-range"], "bytes 500-999/1000");
    });
  });

  describe("precompressed", () => {
    it("should serve the brotli sibling to clients that accept it", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { precompressed: { brotli: true, gzip: true } });
      const res = await server.request("/app.js", { headers: { "accept-encoding": "gzip, br" } });

      assert.strictEqual(res.headers["content-encoding"], "br");
      assert.strictEqual(res.headers["content-type"], "text/javascript; charset=utf-8");
      assert.strictEqual(res.headers.vary, "Accept-Encoding");
      assert.strictEqual(zlib.brotliDecompressSync(res.body).toString(), kAppJs);
    });

    it("should fall back to gzip, then to the original", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { precompressed: { brotli: true, gzip: true } });

      const gzip = await server.request("/app.js", { headers: { "accept-encoding": "gzip, br;q=0" } });
      assert.strictEqual(gzip.headers["content-encoding"], "gzip");
      assert.strictEqual(zlib.gunzipSync(gzip.body).toString(), kAppJs);

      const identity = await server.request("/app.js");
      assert.strictEqual(identity.headers["content-encoding"], undefined);
      assert.strictEqual(identity.headers.vary, "Accept-Encoding");
      assert.strictEqual(identity.text, kAppJs);
    });

    it("should serve the original when no sibling exists", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { precompressed: { brotli: true } });
      const res = await server.request("/style.css", { headers: { "accept-encoding": "br" } });

      assert.strictEqual(res.headers["content-encoding"], undefined);
      assert.strictEqual(res.text, "body{}");
    });

    it("should ignore siblings when precompressed is off", async() => {
      await using www = await createWww();
      await using server = await serve(www.root);
      const res = await server.request("/app.js", { headers: { "accept-encoding": "br" } });

      assert.strictEqual(res.headers["content-encoding"], undefined);
      assert.strictEqual(res.headers.vary, undefined);
    });

    it("should use the variant's own ETag", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, { precompressed: { brotli: true } });
      const br = await server.request("/app.js", { headers: { "accept-encoding": "br" } });
      const identity = await server.request("/app.js");

      assert.notStrictEqual(br.headers.etag, identity.headers.etag);
    });
  });

  describe("errors", () => {
    function failing(): ServoSource {
      return {
        lookup: () => Promise.reject(Object.assign(new Error("denied"), { code: "EACCES" }))
      };
    }

    it("should answer 500 on a lookup error", async() => {
      await using server = await serve(failing());

      assert.strictEqual((await server.request("/a.txt")).status, 500);
    });

    it("should call onError before the headers are written", async() => {
      const errors: unknown[] = [];
      await using server = await serve(failing(), {
        onError(error, _req, res) {
          errors.push(error);
          res.statusCode = 503;
          res.end();
        }
      });

      assert.strictEqual((await server.request("/a.txt")).status, 503);
      assert.strictEqual((errors[0] as any).code, "EACCES");
    });

    it("should destroy the response on an error after the headers are written", async() => {
      await using www = await createWww();
      await using server = await serve(www.root, {
        onNoMatch(_req, res) {
          res.write("partial");
          throw new Error("boom");
        }
      });

      await assert.rejects(() => server.request("/missing.txt"));
    });

    it("should destroy the response when onError throws", async() => {
      await using server = await serve(failing(), {
        onError() {
          throw new Error("boom");
        }
      });

      await assert.rejects(() => server.request("/a.txt"));
    });
  });

  it("should serve a bytes source", async() => {
    const files = new Map([["hello.txt", new TextEncoder().encode("hello")]]);
    await using server = await serve(
      bytesSource(async(path) => files.get(path) ?? null, { etag: "content" }),
      { prefix: "/assets", index: false, extensions: [], redirect: false, dotfiles: "allow" }
    );

    const res = await server.request("/assets/hello.txt");
    assert.strictEqual(res.text, "hello");
    assert.match(res.headers.etag ?? "", /^"/);

    const cached = await server.request("/assets/hello.txt", {
      headers: { "if-none-match": res.headers.etag }
    });
    assert.strictEqual(cached.status, 304);
    assert.strictEqual((await server.request("/assets/")).status, 404);
  });
});
