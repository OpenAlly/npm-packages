// Import Node.js Dependencies
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import * as Result from "../src/index.ts";

describe("Result", () => {
  describe("wrap", () => {
    it("should wrap a function returning a value", () => {
      const result = Result.wrap(() => 5);

      assert.ok(Result.isResult(result));
      assert.ok(result.ok);
      assert.strictEqual(result.err, false);
      assert.strictEqual(result.unwrap(), 5);
    });

    it("should wrap a function throwing an error", () => {
      const result = Result.wrap(function oops() {
        throw new Error("oops");
      });

      assert.strictEqual(result.ok, false);
      assert.ok(result.err);
      assert.throws(
        () => result.unwrap(),
        { message: "oops" }
      );
    });
  });
});
