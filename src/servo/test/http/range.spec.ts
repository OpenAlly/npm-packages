// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { parseRange } from "../../src/index.ts";

describe("parseRange", () => {
  it("should parse a closed range", () => {
    assert.deepStrictEqual(parseRange("bytes=10-19", 100), { start: 10, end: 19 });
  });

  it("should serve exactly one byte for bytes=0-0", () => {
    assert.deepStrictEqual(parseRange("bytes=0-0", 100), { start: 0, end: 0 });
  });

  it("should parse an open range to the end", () => {
    assert.deepStrictEqual(parseRange("bytes=90-", 100), { start: 90, end: 99 });
  });

  it("should serve the last n bytes of a suffix range", () => {
    assert.deepStrictEqual(parseRange("bytes=-500", 1000), { start: 500, end: 999 });
  });

  it("should clamp a suffix larger than the size", () => {
    assert.deepStrictEqual(parseRange("bytes=-500", 100), { start: 0, end: 99 });
  });

  it("should clamp the end to the last byte", () => {
    assert.deepStrictEqual(parseRange("bytes=50-5000", 100), { start: 50, end: 99 });
  });

  it("should accept whitespace and a case-insensitive unit", () => {
    assert.deepStrictEqual(parseRange(" Bytes = 1 - 2 ", 100), { start: 1, end: 2 });
  });

  it("should be unsatisfiable when start > end", () => {
    assert.strictEqual(parseRange("bytes=10-5", 100), "unsatisfiable");
  });

  it("should be unsatisfiable when start is at or beyond the size", () => {
    assert.strictEqual(parseRange("bytes=100-", 100), "unsatisfiable");
    assert.strictEqual(parseRange("bytes=999999-", 100), "unsatisfiable");
    assert.strictEqual(parseRange("bytes=0-", 0), "unsatisfiable");
  });

  it("should be unsatisfiable for a zero suffix or an empty representation", () => {
    assert.strictEqual(parseRange("bytes=-0", 100), "unsatisfiable");
    assert.strictEqual(parseRange("bytes=-10", 0), "unsatisfiable");
  });

  it("should ignore multiple ranges", () => {
    assert.strictEqual(parseRange("bytes=0-1,4-5", 100), null);
  });

  it("should ignore other units and bad syntax", () => {
    assert.strictEqual(parseRange("items=0-1", 100), null);
    assert.strictEqual(parseRange("bytes=-", 100), null);
    assert.strictEqual(parseRange("bytes=a-b", 100), null);
    assert.strictEqual(parseRange("bytes=1", 100), null);
    assert.strictEqual(parseRange("", 100), null);
  });

  it("should reject long whitespace runs in linear time", () => {
    const padding = " ".repeat(100_000);
    const start = performance.now();

    assert.strictEqual(parseRange(`bytes=${padding}x`, 100), null);
    assert.strictEqual(parseRange(`bytes=-${padding}x`, 100), null);
    assert.ok(performance.now() - start < 100);
  });
});
