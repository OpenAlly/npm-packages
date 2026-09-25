// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { cacheControl } from "../../src/index.ts";
import { acceptsEncoding } from "../../src/http/acceptEncoding.ts";
import { strongEtag, weakEtag } from "../../src/http/etag.ts";

describe("cacheControl", () => {
  it("should return null without maxAge", () => {
    assert.strictEqual(cacheControl({}), null);
  });

  it("should force no-cache in dev", () => {
    assert.strictEqual(cacheControl({ dev: true, maxAge: 3600, immutable: true }), "no-cache");
  });

  it("should build a public max-age", () => {
    assert.strictEqual(cacheControl({ maxAge: 3600 }), "public, max-age=3600");
    assert.strictEqual(cacheControl({ maxAge: 12.9 }), "public, max-age=12");
  });

  it("should add immutable", () => {
    assert.strictEqual(
      cacheControl({ maxAge: 31536000, immutable: true }),
      "public, max-age=31536000, immutable"
    );
  });

  it("should add must-revalidate when max-age is 0", () => {
    assert.strictEqual(cacheControl({ maxAge: 0 }), "public, max-age=0, must-revalidate");
    assert.strictEqual(cacheControl({ maxAge: -5 }), "public, max-age=0, must-revalidate");
  });
});

describe("etag", () => {
  it("should build a weak tag from size and mtime in hexadecimal", () => {
    assert.strictEqual(weakEtag(255, new Date(4096)), "W/\"ff-1000\"");
  });

  it("should build a strong tag from the content", () => {
    const tag = strongEtag("hello");

    assert.match(tag, /^"[\w-]+"$/);
    assert.strictEqual(strongEtag(new TextEncoder().encode("hello")), tag);
    assert.notStrictEqual(strongEtag("hello!"), tag);
  });
});

describe("acceptsEncoding", () => {
  it("should reject a missing header", () => {
    assert.strictEqual(acceptsEncoding(undefined, "br"), false);
  });

  it("should accept a listed coding", () => {
    assert.strictEqual(acceptsEncoding("gzip, deflate, br", "br"), true);
    assert.strictEqual(acceptsEncoding("GZIP", "gzip"), true);
  });

  it("should reject an unlisted coding", () => {
    assert.strictEqual(acceptsEncoding("gzip", "br"), false);
  });

  it("should honor q-values", () => {
    assert.strictEqual(acceptsEncoding("br;q=0", "br"), false);
    assert.strictEqual(acceptsEncoding("br; q=0.5", "br"), true);
    assert.strictEqual(acceptsEncoding("br;level=1;Q=0.0", "br"), false);
    assert.strictEqual(acceptsEncoding("br;q=abc", "br"), false);
    assert.strictEqual(acceptsEncoding("br;q", "br"), false);
  });

  it("should use the wildcard for unlisted codings", () => {
    assert.strictEqual(acceptsEncoding("*", "br"), true);
    assert.strictEqual(acceptsEncoding("*;q=0", "br"), false);
  });

  it("should prefer an explicit entry over the wildcard", () => {
    assert.strictEqual(acceptsEncoding("*, br;q=0", "br"), false);
    assert.strictEqual(acceptsEncoding("*;q=0, br", "br"), true);
  });
});
