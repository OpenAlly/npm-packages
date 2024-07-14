// Import Node.js Dependencies
import { describe, it } from "node:test";
import assert from "assert";

// Import Internal Dependencies
import { formatAjvErrors, limitObjectDepth, deepGet, deepSet } from "../src/utils.js";

describe("Utils", () => {
  describe("formatAjvErrors", () => {
    it("should return an empty string", () => {
      assert.strictEqual(formatAjvErrors(null as any), "");
      assert.strictEqual(formatAjvErrors(undefined as any), "");
      assert.strictEqual(formatAjvErrors([]), "");
    });

    it("should return a formatted string", () => {
      const errors: any = [
        {
          instancePath: "",
          message: "should have required property 'name'"
        },
        {
          instancePath: "",
          message: "should have required property 'version'"
        }
      ];
      const expected = "should have required property 'name'\nshould have required property 'version'\n";

      assert.strictEqual(formatAjvErrors(errors), expected);
    });
  });

  describe("limitObjectDepth", () => {
    it("should return the keys if depth is 0 (by default)", () => {
      const obj = { name: "hello", version: "1.0.0" };
      assert.deepStrictEqual(limitObjectDepth(obj), ["name", "version"]);
    });

    it("should return the keys if depth is 0 (explicit)", () => {
      const obj = { name: "hello", version: "1.0.0" };
      assert.deepStrictEqual(limitObjectDepth(obj, 0), ["name", "version"]);
    });

    it("should return the given value if it's not an object", () => {
      assert.strictEqual(limitObjectDepth("hello" as any), "hello");
      assert.strictEqual(limitObjectDepth(42 as any), 42);
      assert.strictEqual(limitObjectDepth(null as any), null);
      assert.strictEqual(limitObjectDepth(undefined as any), undefined);
    });

    it("should return an empty object", () => {
      assert.deepStrictEqual(limitObjectDepth(null as any), null);
      assert.deepStrictEqual(limitObjectDepth(undefined as any), undefined);
    });

    it("should return an object with only keys and depth 1", () => {
      const obj = { name: "hello", version: "1.0.0", author: { name: "John Doe" } };
      const expected = { name: "hello", version: "1.0.0", author: ["name"] };

      assert.deepStrictEqual(limitObjectDepth(obj, 1), expected);
    });
  });

  describe("deepGet", () => {
    it("should return the value at the given path", () => {
      const obj = { name: "hello", version: "1.0.0", author: { name: "John Doe" } };
      assert.strictEqual(deepGet(obj, "author.name"), "John Doe");
    });

    it("should return null if the path is not found", () => {
      const obj = { name: "hello", version: "1.0.0", author: { name: "John Doe" } };
      assert.strictEqual(deepGet(obj, "author.age"), null);
    });
  });

  describe("deepSet", () => {
    it("should set the value at the given path", () => {
      const obj = { name: "hello", version: "1.0.0", author: { name: "John Doe" } };
      const expected = { name: "hello", version: "1.0.0", author: { name: "Jane Doe" } };

      assert.deepStrictEqual(deepSet(obj, "author.name", "Jane Doe"), expected);
    });

    it("should create the path if it does not exist", () => {
      const obj = { name: "hello", version: "1.0.0" };
      const expected = { name: "hello", version: "1.0.0", author: { name: "John Doe" } };
      const result = deepSet(obj, "author.name", "John Doe");

      assert.deepStrictEqual(result, expected);
    });
  });
});
