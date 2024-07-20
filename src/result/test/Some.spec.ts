// Import Node.js Dependencies
import { describe, test } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import { Some, None } from "../src/index.js";

describe("Some", () => {
  test("should return default value if Some is transformed to None and unwrapped", () => {
    const unwrappedValue = Some(1)
      .andThen(() => None)
      .unwrapOr(5);

    assert.equal(unwrappedValue, 5);
  });
});
