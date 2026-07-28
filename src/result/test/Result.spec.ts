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

  describe("combine", () => {
    it("should combine an array of Ok into an Ok of array", () => {
      const result = Result.combine([Result.Ok(1), Result.Ok("foo"), Result.Ok(true)]);

      assert.ok(result.ok);
      assert.deepEqual(result.unwrap(), [1, "foo", true]);
    });

    it("should short-circuit on the first Err", () => {
      const result = Result.combine([
        Result.Ok(1),
        Result.Err("oops"),
        Result.Err("never reached")
      ]);

      assert.strictEqual(result.err, true);
      assert.strictEqual(result.val, "oops");
    });
  });

  describe("combineWithAllErrors", () => {
    it("should combine an array of Ok into an Ok of array", () => {
      const result = Result.combineWithAllErrors([Result.Ok(1), Result.Ok(2)]);

      assert.ok(result.ok);
      assert.deepEqual(result.unwrap(), [1, 2]);
    });

    it("should collect every Err instead of short-circuiting", () => {
      const result = Result.combineWithAllErrors([
        Result.Ok(1),
        Result.Err("first"),
        Result.Err("second")
      ]);

      assert.strictEqual(result.err, true);
      assert.deepEqual(result.val, ["first", "second"]);
    });
  });
});
