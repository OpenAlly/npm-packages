// Import Node.js Dependencies
import { describe, it } from "node:test";
import assert from "node:assert";

// Import Internal Dependencies
import { tSv, TSV_SYMBOL } from "../src/index";

describe("tSv", () => {
  it("should return a function", () => {
    const fn = tSv();

    assert.equal(typeof fn, "function");
  });

  it("should return a value with an hidden Symbol on it", () => {
    const result = tSv()("");

    assert.equal(result[TSV_SYMBOL], true);
    assert.equal(Object.keys(result).length, 2);
  });

  it("should return the expected TTL and value", () => {
    const expectedTTL = 500;
    const expectedValue = "foobar";

    const result = tSv({ ttl: expectedTTL })(expectedValue);

    assert.equal(result.ttl, expectedTTL);
    assert.equal(result.value, expectedValue);
    assert.deepEqual(
      Object.keys(result).sort(),
      ["ttl", "value"].sort()
    );
  });

  it("should return an undefined TTL", () => {
    const result = tSv()("");

    assert.equal(result.ttl, undefined);
  });
});
