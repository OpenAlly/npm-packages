// Import Node.js Dependencies
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import { Ok, Err, Result, Some, None } from "../src/index.js";

describe("Ok", () => {
  describe("constructor", () => {
    it("should expose three properties: ok, err and val", () => {
      const result = Ok(1);

      assert.ok(result.ok);
      assert.ok(!result.err);
      assert.strictEqual(result.val, 1);
    });

    it("should be a Result", () => {
      assert.ok(Result.isResult(Ok(1)));
    });
  });

  describe("unwrap", () => {
    it("should return boxed value without throwing error", () => {
      assert.strictEqual(Ok(1).unwrap(), 1);
    });
  });

  describe("safeUnwrap", () => {
    it("should return boxed value without throwing error", () => {
      assert.strictEqual(Ok(1).safeUnwrap(), 1);
    });
  });

  describe("unwrapOr", () => {
    it("should unwraped the original boxed value (without applying Or value)", () => {
      assert.strictEqual(Ok(1).unwrapOr(5), 1);
    });
  });

  describe("map", () => {
    it("should map on the boxed value and return a new value", () => {
      assert.strictEqual(
        Ok(1).map((v) => v + 1).unwrap(),
        2
      );
    });
  });

  describe("mapErr", () => {
    it("should not map on the boxed value as this is not an Err value", () => {
      assert.strictEqual(
        Ok(1).mapErr(() => Err("oops")).unwrap(),
        1
      );
    });
  });

  describe("andThen", () => {
    it("should map and return a new Ok value", () => {
      assert.strictEqual(
        Ok(1).andThen((v) => Ok(v + 1)).unwrap(),
        2
      );
    });

    it("should map with an Err value", () => {
      const result = Ok(1).andThen(() => Err("oops"));

      assert.ok(!result.ok);
    });
  });
});

describe("Err", () => {
  describe("constructor", () => {
    it("should expose three properties: ok, err, val and stack", () => {
      const result = Err("oops");

      assert.ok(!result.ok);
      assert.ok(result.err);
      assert.strictEqual(result.val, "oops");

      assert.ok(typeof result.stack === "string");
    });

    it("should be a Result", () => {
      assert.ok(Result.isResult(Err("oops")));
    });
  });

  describe("unwrap", () => {
    it("should unwrap the original Error with no mutation", () => {
      assert.throws(
        () => Err(new Error("oops")).unwrap(),
        { message: "oops" }
      );
    });

    it("should unwrap the origin CustomError with no mutation (and with the same Behavior as for a classical Error)", () => {
      class CustomError extends Error {
        foo: string;

        constructor(message: string) {
          super(message);
          this.foo = "bar";
        }
      }

      assert.throws(
        () => Err(new CustomError("oops")).unwrap(),
        { message: "oops" }
      );
    });

    it("should wrap the literal value into a new Error", () => {
      assert.throws(
        () => Err(10).unwrap(),
        { message: /^Tried to unwrap Error: 10.*/g }
      );
    });
  });

  describe("unwrapOr", () => {
    it("should return the Or value as value is Err", () => {
      assert.strictEqual(Err("oops").unwrapOr(5), 5);
    });
  });

  describe("map", () => {
    it("should not map on Err value and keep original boxed Err", () => {
      assert.throws(
        () => Err(new Error("oops")).map(() => 1).unwrap(),
        { message: "oops" }
      );
    });
  });

  describe("andThen", () => {
    it("should not map/updated boxed value", () => {
      assert.throws(
        () => Err(new Error("oops")).andThen(() => Ok(1)).unwrap(),
        { message: "oops" }
      );
    });
  });

  describe("mapErr", () => {
    it("should map and return a new Err value", () => {
      assert.throws(
        () => Err("oops").mapErr(() => new Error("oh no!")).unwrap(),
        { message: "oh no!" }
      );
    });
  });
});

describe("Result", () => {
  describe("wrap", () => {
    it("should wrap a function returning a value", () => {
      const result = Result.wrap(() => 5);

      assert.ok(result.ok);
      assert.strictEqual(result.unwrap(), 5);
    });

    it("should wrap a function throwing an error", () => {
      const result = Result.wrap(function oops() {
        throw new Error("oops");
      });

      assert.ok(!result.ok);
      assert.throws(
        () => result.unwrap(),
        { message: "oops" }
      );
    });
  });
});

describe("Some", () => {
  it("should return default value if Some is transformed to None and unwrapped", () => {
    const unwrappedValue = Some(1)
      .andThen(() => None)
      .unwrapOr(5);

    assert.equal(unwrappedValue, 5);
  });
});
