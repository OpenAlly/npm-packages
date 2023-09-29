// Import Node.js Dependencies
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import Internal Dependencies
import { stringifyValue, isIterable } from "../src/utils.js";

describe("stringifyValue", () => {
  it("should transform all primitives to string", () => {
    assert.strictEqual(stringifyValue("foo"), "foo");
    assert.strictEqual(stringifyValue("5"), "5");
    assert.strictEqual(stringifyValue("0"), "0");
    assert.strictEqual(stringifyValue(5n), "5");
    assert.strictEqual(stringifyValue(Symbol(123)), "Symbol(123)");
    assert.strictEqual(stringifyValue(null), "null");
    assert.strictEqual(stringifyValue(undefined), "undefined");
    assert.strictEqual(stringifyValue(true), "true");
    assert.strictEqual(stringifyValue(false), "false");
  });

  it("should transform Objects", () => {
    assert.strictEqual(stringifyValue([1, 2, 3]), "[1,2,3]");
    assert.strictEqual(stringifyValue({ foo: "bar" }), `{"foo":"bar"}`);
  });
});

describe("isIterable", () => {
  it("should return true for values implementing Symbol.iterator", () => {
    assert.ok(isIterable([]));
    assert.ok(isIterable("foobar"));
    assert.ok(isIterable(new Set()));
    assert.ok(isIterable(new Map()));
    assert.ok(isIterable(Object.entries({ foo: "bar" })));

    const obj = {
      [Symbol.iterator]: () => void 0
    };
    assert.ok(isIterable(obj));
  });

  it("should return false for null or undefined", () => {
    assert.ok(!isIterable(null));
    assert.ok(!isIterable(undefined));
  });
});
