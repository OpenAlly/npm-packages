// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import {
  decodeRequestPath,
  isDotfilePath,
  normalizePosix
} from "../../src/index.ts";
import { splitTarget } from "../../src/paths/decodeRequestPath.ts";

describe("normalizePosix", () => {
  it("should collapse dot and empty segments", () => {
    assert.strictEqual(normalizePosix("a/./b//c"), "a/b/c");
  });

  it("should collapse parent segments", () => {
    assert.strictEqual(normalizePosix("a/b/../c"), "a/c");
  });

  it("should keep leading parent segments", () => {
    assert.strictEqual(normalizePosix("../a"), "../a");
    assert.strictEqual(normalizePosix("../../a"), "../../a");
    assert.strictEqual(normalizePosix("a/../../b"), "../b");
  });

  it("should preserve a trailing slash", () => {
    assert.strictEqual(normalizePosix("a/b/"), "a/b/");
  });

  it("should return a dot for an empty result", () => {
    assert.strictEqual(normalizePosix(""), ".");
    assert.strictEqual(normalizePosix("a/.."), ".");
    assert.strictEqual(normalizePosix("a/../"), "./");
  });
});

describe("decodeRequestPath", () => {
  it("should decode percent-encoding once", () => {
    assert.strictEqual(decodeRequestPath("a%20b/%252e"), "a b/%2e");
  });

  it("should decode encoded slashes and dots", () => {
    assert.strictEqual(decodeRequestPath("..%2f%2e%2e%5c"), "../..\\");
  });

  it("should drop the query string and fragment", () => {
    assert.strictEqual(decodeRequestPath("a.txt?x=%zz#frag"), "a.txt");
    assert.strictEqual(decodeRequestPath("a.txt#frag?x"), "a.txt");
  });

  it("should return null on malformed encoding", () => {
    assert.strictEqual(decodeRequestPath("%E0%A4%A"), null);
    assert.strictEqual(decodeRequestPath("%"), null);
  });
});

describe("splitTarget", () => {
  it("should split path and query", () => {
    assert.deepStrictEqual(splitTarget("/a?b=1"), { path: "/a", search: "?b=1" });
  });

  it("should drop the fragment", () => {
    assert.deepStrictEqual(splitTarget("/a?b=1#c"), { path: "/a", search: "?b=1" });
    assert.deepStrictEqual(splitTarget("/a#c?d"), { path: "/a", search: "" });
  });

  it("should return an empty search without separator", () => {
    assert.deepStrictEqual(splitTarget("/a"), { path: "/a", search: "" });
  });
});

describe("isDotfilePath", () => {
  it("should detect a dot segment anywhere", () => {
    assert.strictEqual(isDotfilePath(".env"), true);
    assert.strictEqual(isDotfilePath(".git/config"), true);
    assert.strictEqual(isDotfilePath("a/.hidden/b.txt"), true);
  });

  it("should allow a leading .well-known segment", () => {
    assert.strictEqual(isDotfilePath(".well-known"), false);
    assert.strictEqual(isDotfilePath(".well-known/security.txt"), false);
  });

  it("should still detect dotfiles below .well-known", () => {
    assert.strictEqual(isDotfilePath(".well-known/.secret"), true);
    assert.strictEqual(isDotfilePath("a/.well-known/x"), true);
  });

  it("should not flag regular paths", () => {
    assert.strictEqual(isDotfilePath(""), false);
    assert.strictEqual(isDotfilePath("a/b.c/d.txt"), false);
  });
});
