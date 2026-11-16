// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import {
  acceptsEncoding,
  cacheControl,
  negotiateEncoding
} from "../../src/index.ts";
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

  it("should clamp max-age to 2147483648 and reject NaN", () => {
    assert.strictEqual(cacheControl({ maxAge: Infinity }), "public, max-age=2147483648");
    assert.strictEqual(cacheControl({ maxAge: -Infinity }), "public, max-age=0, must-revalidate");
    assert.throws(() => cacheControl({ maxAge: Number.NaN }), TypeError);
  });

  it("should use private instead of public", () => {
    assert.strictEqual(
      cacheControl({ maxAge: 31536000, immutable: true, private: true }),
      "private, max-age=31536000, immutable"
    );
    assert.strictEqual(cacheControl({ dev: true, private: true }), "no-cache");
    assert.strictEqual(cacheControl({ private: true }), null);
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

describe("negotiateEncoding", () => {
  it("should return null when nothing is accepted", () => {
    assert.strictEqual(negotiateEncoding(undefined, ["br", "gzip"]), null);
    assert.strictEqual(negotiateEncoding("deflate", ["br", "gzip"]), null);
    assert.strictEqual(negotiateEncoding("br;q=0, gzip;q=0", ["br", "gzip"]), null);
    assert.strictEqual(negotiateEncoding("br", []), null);
  });

  it("should break q-value ties with the order of codings", () => {
    assert.strictEqual(negotiateEncoding("gzip, br", ["br", "gzip"]), "br");
    assert.strictEqual(negotiateEncoding("gzip, br", ["gzip", "br"]), "gzip");
    assert.strictEqual(negotiateEncoding("*", ["br", "gzip"]), "br");
  });

  it("should pick the highest q-value", () => {
    assert.strictEqual(negotiateEncoding("gzip, br;q=0.5", ["br", "gzip"]), "gzip");
    assert.strictEqual(negotiateEncoding("*;q=0.1, gzip;q=0.5", ["br", "gzip"]), "gzip");
    assert.strictEqual(negotiateEncoding("*;q=0.9, gzip;q=0.5", ["br", "gzip"]), "br");
  });

  it("should match codings case-insensitively and keep the given spelling", () => {
    assert.strictEqual(negotiateEncoding("BR", ["br"]), "br");
    assert.strictEqual(negotiateEncoding("br", ["BR"]), "BR");
  });
});
