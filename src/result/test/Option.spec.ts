// Import Node.js Dependencies
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import { Option, None } from "../src/index.ts";

describe("Option.from", () => {
  it("should return None for null", () => {
    assert.strictEqual(Option.from(null), None);
  });

  it("should return None for undefined", () => {
    assert.strictEqual(Option.from(undefined), None);
  });

  it("should return Some for a present value", () => {
    const option = Option.from(5);

    assert.ok(option.some);
    assert.strictEqual(option.unwrap(), 5);
  });

  it("should return Some for falsy but non-nullish values", () => {
    assert.strictEqual(Option.from(0).unwrap(), 0);
    assert.strictEqual(Option.from("").unwrap(), "");
    assert.strictEqual(Option.from(false).unwrap(), false);
  });
});
