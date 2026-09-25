// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { contentType, DEFAULT_CONTENT_TYPES } from "../../src/index.ts";
import { isTextual } from "../../src/mime/contentTypes.ts";

describe("contentType", () => {
  it("should add a charset to textual types", () => {
    assert.strictEqual(contentType("index.html"), "text/html; charset=utf-8");
    assert.strictEqual(contentType("app.js"), "text/javascript; charset=utf-8");
    assert.strictEqual(contentType("style.css"), "text/css; charset=utf-8");
    assert.strictEqual(contentType("data.json"), "application/json; charset=utf-8");
    assert.strictEqual(contentType("app.js.map"), "application/json; charset=utf-8");
    assert.strictEqual(contentType("icon.svg"), "image/svg+xml; charset=utf-8");
    assert.strictEqual(contentType("feed.xml"), "application/xml; charset=utf-8");
    assert.strictEqual(contentType("scene.gltf"), "model/gltf+json; charset=utf-8");
  });

  it("should not add a charset to binary types", () => {
    assert.strictEqual(contentType("image.png"), "image/png");
    assert.strictEqual(contentType("module.wasm"), "application/wasm");
    assert.strictEqual(contentType("font.woff2"), "font/woff2");
  });

  it("should match case-insensitively on the basename", () => {
    assert.strictEqual(contentType("a/b/IMAGE.PNG"), "image/png");
    assert.strictEqual(contentType("a\\b\\image.png"), "image/png");
  });

  it("should fall back to octet-stream", () => {
    assert.strictEqual(contentType("unknown.xyz"), "application/octet-stream");
    assert.strictEqual(contentType("README"), "application/octet-stream");
  });

  it("should not match a name equal to the suffix", () => {
    assert.strictEqual(contentType(".json"), "application/octet-stream");
  });

  it("should pick the longest matching suffix", () => {
    const table = { ...DEFAULT_CONTENT_TYPES, ".tar.gz": "application/gzip", ".gz": "application/x-gzip" };

    assert.strictEqual(contentType("archive.tar.gz", table), "application/gzip");
    assert.strictEqual(contentType("file.gz", table), "application/x-gzip");
  });

  it("should keep explicit parameters from the table", () => {
    assert.strictEqual(
      contentType("a.txt", { ".txt": "text/plain; charset=latin1" }),
      "text/plain; charset=latin1"
    );
  });

  it("should cover the required extensions", () => {
    const required = [
      "html", "htm", "css", "js", "mjs", "cjs", "json", "map", "wasm", "txt", "md", "xml", "csv", "svg",
      "png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico", "woff", "woff2", "ttf", "otf",
      "mp3", "ogg", "wav", "mp4", "webm", "glb", "gltf", "pdf", "zip"
    ];
    for (const extension of required) {
      assert.ok(`.${extension}` in DEFAULT_CONTENT_TYPES, extension);
    }
  });
});

describe("isTextual", () => {
  it("should detect textual essences", () => {
    assert.strictEqual(isTextual("text/plain"), true);
    assert.strictEqual(isTextual("application/ld+json"), true);
    assert.strictEqual(isTextual("application/javascript"), true);
    assert.strictEqual(isTextual("Application/JSON; x=y"), true);
    assert.strictEqual(isTextual("image/png"), false);
  });
});
