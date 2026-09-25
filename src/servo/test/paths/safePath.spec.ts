// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { safePath, type PathRejection } from "../../src/index.ts";

function rejected(
  input: string
): PathRejection | null {
  const result = safePath(input);

  return result.ok ? null : result.reason;
}

describe("safePath", () => {
  it("should accept and normalize a relative file path", () => {
    assert.deepStrictEqual(safePath("a/./b//c.txt"), { ok: true, path: "a/b/c.txt", directory: false });
  });

  it("should collapse inner traversal that stays inside the root", () => {
    assert.deepStrictEqual(safePath("a/../b"), { ok: true, path: "b", directory: false });
  });

  it("should flag an empty path as the root directory", () => {
    assert.deepStrictEqual(safePath(""), { ok: true, path: "", directory: true });
  });

  it("should flag a path that collapses to the root as a directory", () => {
    assert.deepStrictEqual(safePath("a/.."), { ok: true, path: "", directory: true });
    assert.deepStrictEqual(safePath("a/../"), { ok: true, path: "", directory: true });
  });

  it("should flag a trailing slash as a directory and strip it", () => {
    assert.deepStrictEqual(safePath("docs/"), { ok: true, path: "docs", directory: true });
  });

  it("should rewrite backslashes to slashes", () => {
    assert.deepStrictEqual(safePath("a\\b.txt"), { ok: true, path: "a/b.txt", directory: false });
  });

  it("should reject control characters as invalid", () => {
    assert.strictEqual(rejected("a/\u0000.txt"), "invalid");
    assert.strictEqual(rejected("a\u001F"), "invalid");
    assert.strictEqual(rejected("a\u007F"), "invalid");
  });

  it("should reject absolute paths", () => {
    assert.strictEqual(rejected("/etc/passwd"), "absolute");
    assert.strictEqual(rejected("\\\\server\\share"), "absolute");
    assert.strictEqual(rejected("C:/Windows/win.ini"), "absolute");
    assert.strictEqual(rejected("c:"), "absolute");
  });

  it("should reject traversal out of the root", () => {
    assert.strictEqual(rejected(".."), "traversal");
    assert.strictEqual(rejected("../package.json"), "traversal");
    assert.strictEqual(rejected("a/../../b"), "traversal");
    assert.strictEqual(rejected("..\\package.json"), "traversal");
  });

  it("should reject colons, trailing dots and trailing spaces", () => {
    assert.strictEqual(rejected("file.txt::$DATA"), "reserved");
    assert.strictEqual(rejected("a/b:c"), "reserved");
    assert.strictEqual(rejected("index.html."), "reserved");
    assert.strictEqual(rejected("index.html "), "reserved");
    assert.strictEqual(rejected("dir./file"), "reserved");
  });

  it("should reject Windows device names in any case and with any extension", () => {
    for (const name of ["CON", "con", "prn", "Aux", "NUL", "com1", "COM9", "lpt1", "LPT9", "com¹"]) {
      assert.strictEqual(rejected(name), "reserved", name);
      assert.strictEqual(rejected(`${name}.txt`), "reserved", `${name}.txt`);
      assert.strictEqual(rejected(`dir/${name}.tar.gz`), "reserved", `dir/${name}.tar.gz`);
    }
  });

  it("should accept names that only contain a device name", () => {
    assert.strictEqual(rejected("console.txt"), null);
    assert.strictEqual(rejected("com10"), null);
    assert.strictEqual(rejected("icon.png"), null);
  });
});
